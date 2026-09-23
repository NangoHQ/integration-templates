import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const OrganizationSchema = z.object({
    id: z.number(),
    name: z.string().optional()
});

const ProjectSchema = z.object({
    id: z.number(),
    name: z.string().optional(),
    status: z.string().optional()
});

const TaskSchema = z.object({
    id: z.number(),
    status: z.string(),
    project_id: z.number(),
    summary: z.string(),
    details: z.string().optional().nullable(),
    assignee_ids: z.array(z.number()).optional(),
    lock_version: z.number().optional().nullable(),
    completed_at: z.string().optional().nullable(),
    due_at: z.string().optional().nullable(),
    created_at: z.string(),
    updated_at: z.string()
});

const TaskModelSchema = z.object({
    id: z.string(),
    status: z.string().optional(),
    project_id: z.number().optional(),
    summary: z.string().optional(),
    details: z.string().optional(),
    assignee_ids: z.array(z.number()).optional(),
    lock_version: z.number().optional(),
    completed_at: z.string().optional(),
    due_at: z.string().optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional()
});

const CheckpointSchema = z.object({
    state: z.string()
});

function parseCheckpointState(state: string): { project_id?: number; task_cursor?: string } {
    if (!state) {
        return {};
    }
    const parts = state.split(':');
    const projectId = Number(parts[0]);
    if (isNaN(projectId)) {
        return {};
    }
    return {
        project_id: projectId,
        ...(parts[1] && { task_cursor: parts[1] })
    };
}

function encodeCheckpointState(projectId: number, taskCursor?: string | number): string {
    if (taskCursor !== undefined) {
        return `${projectId}:${taskCursor}`;
    }
    return String(projectId);
}

const sync = createSync({
    description: 'Sync tasks across all projects',
    version: '1.0.1',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        Task: TaskModelSchema
    },

    exec: async (nango) => {
        const rawCheckpoint = await nango.getCheckpoint();
        const checkpointResult = rawCheckpoint === null || rawCheckpoint === undefined ? null : CheckpointSchema.safeParse(rawCheckpoint);
        const checkpoint = checkpointResult?.success ? parseCheckpointState(checkpointResult.data.state) : {};

        // Start (or resume) the full-refresh deletion window before the provider
        // requests used to discover organizations and projects.
        await nango.trackDeletesStart('Task');

        const orgsProxyConfig: ProxyConfiguration = {
            // https://developer.hubstaff.com/
            endpoint: 'v2/organizations',
            paginate: {
                type: 'cursor',
                cursor_name_in_request: 'page_start_id',
                cursor_path_in_response: 'pagination.next_page_start_id',
                response_path: 'organizations',
                limit_name_in_request: 'page_limit',
                limit: 100
            },
            retries: 3
        };

        const organizations: z.infer<typeof OrganizationSchema>[] = [];
        for await (const orgsPage of nango.paginate(orgsProxyConfig)) {
            for (const org of orgsPage) {
                const parsed = OrganizationSchema.safeParse(org);
                if (!parsed.success) {
                    throw new Error(`Failed to parse organization: ${parsed.error.message}`);
                }
                organizations.push(parsed.data);
            }
        }

        const allProjects: z.infer<typeof ProjectSchema>[] = [];
        for (const org of organizations) {
            const projectsProxyConfig: ProxyConfiguration = {
                // https://developer.hubstaff.com/
                endpoint: `v2/organizations/${encodeURIComponent(String(org.id))}/projects`,
                paginate: {
                    type: 'cursor',
                    cursor_name_in_request: 'page_start_id',
                    cursor_path_in_response: 'pagination.next_page_start_id',
                    response_path: 'projects',
                    limit_name_in_request: 'page_limit',
                    limit: 100
                },
                retries: 3
            };

            for await (const projectsPage of nango.paginate(projectsProxyConfig)) {
                for (const project of projectsPage) {
                    const parsed = ProjectSchema.safeParse(project);
                    if (!parsed.success) {
                        throw new Error(`Failed to parse project: ${parsed.error.message}`);
                    }
                    allProjects.push(parsed.data);
                }
            }
        }

        let projectIndex = 0;

        if (checkpoint.project_id !== undefined) {
            const resumeIndex = allProjects.findIndex((p) => p.id === checkpoint.project_id);
            if (resumeIndex !== -1) {
                projectIndex = resumeIndex;
            }
        }

        for (let i = projectIndex; i < allProjects.length; i++) {
            const project = allProjects[i];
            if (project === undefined) {
                throw new Error(`Project at index ${i} is undefined`);
            }

            let nextTaskCursor: string | number | undefined;
            const taskCursor = checkpoint.project_id === project.id ? checkpoint.task_cursor : undefined;

            const tasksProxyConfig: ProxyConfiguration = {
                // https://developer.hubstaff.com/
                endpoint: `v2/projects/${encodeURIComponent(String(project.id))}/tasks`,
                ...(taskCursor !== undefined && {
                    params: {
                        page_start_id: String(taskCursor)
                    }
                }),
                paginate: {
                    type: 'cursor',
                    cursor_name_in_request: 'page_start_id',
                    cursor_path_in_response: 'pagination.next_page_start_id',
                    response_path: 'tasks',
                    limit_name_in_request: 'page_limit',
                    limit: 100,
                    on_page: async ({ nextPageParam }) => {
                        nextTaskCursor = typeof nextPageParam === 'string' || typeof nextPageParam === 'number' ? nextPageParam : undefined;
                    }
                },
                retries: 3
            };

            for await (const tasksPage of nango.paginate(tasksProxyConfig)) {
                const activeTasks: z.infer<typeof TaskModelSchema>[] = [];
                const deletedTasks: { id: string }[] = [];

                for (const task of tasksPage) {
                    const parsed = TaskSchema.safeParse(task);
                    if (!parsed.success) {
                        throw new Error(`Failed to parse task: ${parsed.error.message}`);
                    }

                    const taskRecord = parsed.data;
                    if (taskRecord.status === 'deleted') {
                        deletedTasks.push({ id: String(taskRecord.id) });
                    } else {
                        activeTasks.push({
                            id: String(taskRecord.id),
                            status: taskRecord.status,
                            project_id: taskRecord.project_id,
                            summary: taskRecord.summary,
                            ...(taskRecord.details != null && { details: taskRecord.details }),
                            ...(taskRecord.assignee_ids !== undefined && { assignee_ids: taskRecord.assignee_ids }),
                            ...(taskRecord.lock_version != null && { lock_version: taskRecord.lock_version }),
                            ...(taskRecord.completed_at != null && { completed_at: taskRecord.completed_at }),
                            ...(taskRecord.due_at != null && { due_at: taskRecord.due_at }),
                            created_at: taskRecord.created_at,
                            updated_at: taskRecord.updated_at
                        });
                    }
                }

                if (activeTasks.length > 0) {
                    await nango.batchSave(activeTasks, 'Task');
                }

                if (deletedTasks.length > 0) {
                    await nango.batchDelete(deletedTasks, 'Task');
                }

                if (nextTaskCursor !== undefined) {
                    await nango.saveCheckpoint({ state: encodeCheckpointState(project.id, nextTaskCursor) });
                }
            }

            const nextProject = allProjects[i + 1];
            if (nextProject !== undefined) {
                await nango.saveCheckpoint({ state: encodeCheckpointState(nextProject.id) });
            }
        }

        await nango.clearCheckpoint();
        await nango.trackDeletesEnd('Task');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
