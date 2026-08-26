import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const MetadataProjectSchema = z.object({
    projectId: z.number().describe('The Basecamp project ID (bucket ID)'),
    todoSetId: z.number().describe('The to-do set ID for the project, found in the project dock')
});

const MetadataSchema = z
    .object({
        projects: z.array(MetadataProjectSchema).describe('List of Basecamp projects to sync to-dos from')
    })
    .describe('Input metadata specifying which projects and their to-do sets to crawl');

const BasecampTodoSchema = z
    .object({
        id: z.string().describe('The unique identifier for the to-do'),
        content: z.string().describe('The title or content of the to-do'),
        description: z.string().optional().describe('Optional HTML description of the to-do'),
        status: z.string().optional().describe('The status of the to-do, such as active, archived, or trashed'),
        completed: z.boolean().optional().describe('Whether the to-do is marked as completed'),
        due_on: z.string().optional().describe('The due date of the to-do in ISO 8601 format'),
        starts_on: z.string().optional().describe('The start date of the to-do in ISO 8601 format'),
        position: z.number().optional().describe('The position or order of the to-do within its list'),
        url: z.string().optional().describe('The API URL for the to-do'),
        app_url: z.string().optional().describe('The Basecamp app URL for the to-do'),
        comments_count: z.number().optional().describe('The number of comments on the to-do'),
        created_at: z.string().optional().describe('The creation timestamp in ISO 8601 format'),
        updated_at: z.string().optional().describe('The last update timestamp in ISO 8601 format'),
        project_id: z.number().describe('The ID of the Basecamp project (bucket) this to-do belongs to'),
        todolist_id: z.number().describe('The ID of the to-do list this to-do belongs to'),
        creator_id: z.number().optional().describe('The ID of the person who created the to-do'),
        assignee_ids: z.array(z.number()).optional().describe('IDs of people assigned to this to-do')
    })
    .describe('A Basecamp to-do item');

const CheckpointSchema = z.object({
    projectIndex: z.number().int(),
    projectId: z
        .number()
        .int()
        .describe(
            'The Basecamp project ID (bucket ID) of the checkpointed project, used to resolve the resume position by identity rather than array position. -1 once every project has been processed.'
        ),
    todoSetId: z
        .number()
        .int()
        .describe(
            'The to-do set ID of the checkpointed project, paired with projectId to resolve the resume position by identity. -1 once every project has been processed.'
        ),
    todolistId: z.string().describe('ID of the next to-do list to resume crawling to-dos for (resolved by identity rather than array position), empty if unset')
});

const BasecampTodoListResponseSchema = z.object({
    id: z.number(),
    title: z.string().optional()
});

const BasecampAssigneeSchema = z.object({
    id: z.number().optional()
});

const BasecampTodoResponseSchema = z.object({
    id: z.number(),
    content: z.string(),
    description: z.string().optional(),
    status: z.string().optional(),
    completed: z.boolean().optional(),
    due_on: z.string().nullable().optional(),
    starts_on: z.string().nullable().optional(),
    position: z.number().optional(),
    url: z.string().optional(),
    app_url: z.string().optional(),
    comments_count: z.number().optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional(),
    creator: z
        .object({
            id: z.number().optional()
        })
        .optional(),
    assignees: z.array(BasecampAssigneeSchema).optional()
});

const sync = createSync({
    description: 'Syncs to-dos from Basecamp for the specified projects',
    version: '3.0.0',
    frequency: 'every hour',
    autoStart: false,
    metadata: MetadataSchema,
    checkpoint: CheckpointSchema,
    models: {
        BasecampTodo: BasecampTodoSchema
    },

    exec: async (nango) => {
        const metadata = await nango.getMetadata();
        if (!metadata || !metadata['projects'] || metadata['projects'].length === 0) {
            throw new Error('Metadata projects array is required');
        }

        const checkpoint = await nango.getCheckpoint();
        const checkpointProjectIndex = checkpoint && typeof checkpoint['projectIndex'] === 'number' ? checkpoint['projectIndex'] : 0;
        const checkpointProjectId = checkpoint && typeof checkpoint['projectId'] === 'number' ? checkpoint['projectId'] : undefined;
        const checkpointTodoSetId = checkpoint && typeof checkpoint['todoSetId'] === 'number' ? checkpoint['todoSetId'] : undefined;
        const startTodolistId = checkpoint && typeof checkpoint['todolistId'] === 'string' ? checkpoint['todolistId'] : '';

        // A checkpoint whose projectIndex is at or past the end of the (user-supplied,
        // fixed-for-this-run) metadata projects list can only come from a prior execution that
        // crashed right at the completion boundary, after its final checkpoint save but before
        // trackDeletesEnd ran. Treat it as "nothing left to crawl this run" and skip delete
        // tracking entirely rather than open and immediately close an empty window, which would
        // delete every stored BasecampTodo.
        if (checkpointProjectIndex >= metadata['projects'].length) {
            await nango.clearCheckpoint();
            return;
        }

        await nango.trackDeletesStart('BasecampTodo');

        // Resume by the identity of the checkpointed project rather than its previous array
        // position: metadata.projects is user-supplied and can be reordered or edited between
        // retries, so a positional projectIndex could resume against the wrong project and skip
        // the checkpointed one entirely. Fall back to a full restart (index 0) if the
        // checkpointed project can no longer be found, rather than trusting a stale positional
        // index that may now point at an unrelated project.
        let startProjectIndex = checkpointProjectIndex;
        if (checkpointProjectId !== undefined && checkpointTodoSetId !== undefined) {
            const resumeIdx = metadata['projects'].findIndex(
                (p) =>
                    p &&
                    typeof p['projectId'] === 'number' &&
                    typeof p['todoSetId'] === 'number' &&
                    p['projectId'] === checkpointProjectId &&
                    p['todoSetId'] === checkpointTodoSetId
            );
            startProjectIndex = resumeIdx !== -1 ? resumeIdx : 0;
        }

        for (let pIdx = startProjectIndex; pIdx < metadata['projects'].length; pIdx++) {
            const project = metadata['projects'][pIdx];
            if (!project || typeof project['projectId'] !== 'number' || typeof project['todoSetId'] !== 'number') {
                throw new Error(`Invalid project metadata at index ${pIdx}`);
            }

            const todolistsConfig: ProxyConfiguration = {
                // https://github.com/basecamp/bc3-api/blob/master/sections/todolists.md#get-to-do-lists
                endpoint: `/buckets/${encodeURIComponent(project['projectId'])}/todosets/${encodeURIComponent(project['todoSetId'])}/todolists.json`,
                paginate: {
                    type: 'link',
                    link_rel_in_response_header: 'next',
                    limit_name_in_request: 'per_page',
                    limit: 100
                },
                retries: 3
            };

            const allTodolists: z.infer<typeof BasecampTodoListResponseSchema>[] = [];
            for await (const page of nango.paginate(todolistsConfig)) {
                const parsed = z.array(BasecampTodoListResponseSchema).safeParse(page);
                if (!parsed.success) {
                    throw new Error(`Failed to parse todolists response: ${parsed.error.message}`);
                }
                allTodolists.push(...parsed.data);
            }

            // Resume by the identity of the checkpointed to-do list rather than its previous
            // array position: the list is refetched fresh for every execution, so if a to-do
            // list changes position between a checkpointed run and its retry, a positional index
            // could resume at a different list entirely and skip the intended one.
            let startTIdx = 0;
            if (pIdx === startProjectIndex && startTodolistId !== '') {
                const resumeIdx = allTodolists.findIndex((t) => String(t.id) === startTodolistId);
                startTIdx = resumeIdx !== -1 ? resumeIdx : 0;
            }

            for (let tIdx = startTIdx; tIdx < allTodolists.length; tIdx++) {
                const todolist = allTodolists[tIdx];
                if (!todolist || typeof todolist.id !== 'number') {
                    throw new Error(`Invalid todolist at index ${tIdx}`);
                }

                const todosConfig: ProxyConfiguration = {
                    // https://github.com/basecamp/bc3-api/blob/master/sections/todos.md#get-to-dos
                    endpoint: `/buckets/${encodeURIComponent(project['projectId'])}/todolists/${encodeURIComponent(todolist.id)}/todos.json`,
                    paginate: {
                        type: 'link',
                        link_rel_in_response_header: 'next',
                        limit_name_in_request: 'per_page',
                        limit: 100
                    },
                    retries: 3
                };

                for await (const page of nango.paginate(todosConfig)) {
                    const parsed = z.array(BasecampTodoResponseSchema).safeParse(page);
                    if (!parsed.success) {
                        throw new Error(`Failed to parse todos response: ${parsed.error.message}`);
                    }

                    const todos = parsed.data.map((todo) => {
                        const assigneeIds: number[] = [];
                        if (todo.assignees) {
                            for (const assignee of todo.assignees) {
                                if (typeof assignee.id === 'number') {
                                    assigneeIds.push(assignee.id);
                                }
                            }
                        }

                        return {
                            id: String(todo.id),
                            content: todo.content,
                            ...(todo.description !== undefined && { description: todo.description }),
                            ...(todo.status !== undefined && { status: todo.status }),
                            ...(todo.completed !== undefined && { completed: todo.completed }),
                            ...(todo.due_on !== null && todo.due_on !== undefined && { due_on: todo.due_on }),
                            ...(todo.starts_on !== null && todo.starts_on !== undefined && { starts_on: todo.starts_on }),
                            ...(todo.position !== undefined && { position: todo.position }),
                            ...(todo.url !== undefined && { url: todo.url }),
                            ...(todo.app_url !== undefined && { app_url: todo.app_url }),
                            ...(todo.comments_count !== undefined && { comments_count: todo.comments_count }),
                            ...(todo.created_at !== undefined && { created_at: todo.created_at }),
                            ...(todo.updated_at !== undefined && { updated_at: todo.updated_at }),
                            project_id: project['projectId'],
                            todolist_id: todolist.id,
                            ...(todo.creator !== undefined && todo.creator.id !== undefined && { creator_id: todo.creator.id }),
                            ...(assigneeIds.length > 0 && { assignee_ids: assigneeIds })
                        };
                    });

                    if (todos.length > 0) {
                        await nango.batchSave(todos, 'BasecampTodo');
                    }
                }

                const nextTodolist = allTodolists[tIdx + 1];
                if (nextTodolist) {
                    await nango.saveCheckpoint({
                        projectIndex: pIdx,
                        projectId: project['projectId'],
                        todoSetId: project['todoSetId'],
                        todolistId: String(nextTodolist.id)
                    });
                } else {
                    // No project identity to carry once every metadata project has been
                    // processed; -1 is a sentinel that never matches a real Basecamp project ID.
                    const nextProject = metadata['projects'][pIdx + 1];
                    const nextProjectId = nextProject && typeof nextProject['projectId'] === 'number' ? nextProject['projectId'] : -1;
                    const nextTodoSetId = nextProject && typeof nextProject['todoSetId'] === 'number' ? nextProject['todoSetId'] : -1;
                    await nango.saveCheckpoint({
                        projectIndex: pIdx + 1,
                        projectId: nextProjectId,
                        todoSetId: nextTodoSetId,
                        todolistId: ''
                    });
                }
            }
        }

        await nango.clearCheckpoint();
        await nango.trackDeletesEnd('BasecampTodo');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
