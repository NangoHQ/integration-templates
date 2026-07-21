import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const LIMIT = 100;

const ProviderTaskSchema = z
    .object({
        id: z.string()
    })
    .passthrough();

const ProviderProjectSchema = z
    .object({
        id: z.string()
    })
    .passthrough();

const ProviderCommentSchema = z
    .object({
        id: z.string(),
        content: z.string().nullish(),
        posted_uid: z.string().nullish(),
        posted_at: z.string().nullish(),
        task_id: z.string().nullish(),
        project_id: z.string().nullish(),
        item_id: z.string().nullish(),
        file_attachment: z.unknown().nullish(),
        uids_to_notify: z.array(z.string()).nullish(),
        is_deleted: z.boolean().nullish(),
        reactions: z.record(z.string(), z.array(z.string())).nullish()
    })
    .passthrough();

const CommentSchema = z.object({
    id: z.string(),
    content: z.string().optional(),
    posted_uid: z.string().optional(),
    posted_at: z.string().optional(),
    task_id: z.string().optional(),
    project_id: z.string().optional(),
    file_attachment: z.unknown().optional(),
    uids_to_notify: z.array(z.string()).optional(),
    is_deleted: z.boolean().optional(),
    reactions: z.record(z.string(), z.array(z.string())).optional()
});

const CheckpointSchema = z.object({
    phase: z.string(),
    scope_id: z.string(),
    cursor: z.string(),
    cursor_active: z.boolean()
});

function toCommentRecord(record: z.infer<typeof ProviderCommentSchema>): z.infer<typeof CommentSchema> {
    return {
        id: record.id,
        ...(record.content != null && { content: record.content }),
        ...(record.posted_uid != null && { posted_uid: record.posted_uid }),
        ...(record.posted_at != null && { posted_at: record.posted_at }),
        ...(record.task_id != null && { task_id: record.task_id }),
        ...(record.project_id != null && { project_id: record.project_id }),
        ...(record.item_id != null && { task_id: record.item_id }),
        ...(record.file_attachment != null && { file_attachment: record.file_attachment }),
        ...(record.uids_to_notify != null && { uids_to_notify: record.uids_to_notify }),
        ...(record.is_deleted != null && { is_deleted: record.is_deleted }),
        ...(record.reactions != null && { reactions: record.reactions })
    };
}

const sync = createSync({
    description: 'Sync comments across all known tasks and projects.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        Comment: CommentSchema
    },

    exec: async (nango) => {
        const rawCheckpoint = await nango.getCheckpoint();
        const checkpoint = rawCheckpoint ? CheckpointSchema.parse(rawCheckpoint) : undefined;
        if (checkpoint && checkpoint.phase !== 'project' && checkpoint.phase !== 'task') {
            throw new Error(`Invalid comment checkpoint phase: ${checkpoint.phase}`);
        }

        // GET /api/v1/comments requires exactly one of task_id or project_id and
        // exposes no modified-since filter, so this remains a full refresh. We
        // still checkpoint the current scope + cursor so interrupted crawls can
        // resume before trackDeletesEnd() closes the snapshot.

        await nango.trackDeletesStart('Comment');

        const projectConfig: ProxyConfiguration = {
            // https://developer.todoist.com/api/v1
            endpoint: '/api/v1/projects',
            paginate: {
                type: 'cursor',
                cursor_name_in_request: 'cursor',
                cursor_path_in_response: 'next_cursor',
                response_path: 'results',
                limit_name_in_request: 'limit',
                limit: LIMIT
            },
            retries: 3
        };

        const projects: string[] = [];
        for await (const page of nango.paginate(projectConfig)) {
            for (const raw of page) {
                const parsed = ProviderProjectSchema.safeParse(raw);
                if (!parsed.success) {
                    throw new Error(`Invalid project record: ${JSON.stringify(raw)}`);
                }
                projects.push(parsed.data.id);
            }
        }

        const taskConfig: ProxyConfiguration = {
            // https://developer.todoist.com/api/v1
            endpoint: '/api/v1/tasks',
            paginate: {
                type: 'cursor',
                cursor_name_in_request: 'cursor',
                cursor_path_in_response: 'next_cursor',
                response_path: 'results',
                limit_name_in_request: 'limit',
                limit: LIMIT
            },
            retries: 3
        };

        const tasks: string[] = [];
        for await (const page of nango.paginate(taskConfig)) {
            for (const raw of page) {
                const parsed = ProviderTaskSchema.safeParse(raw);
                if (!parsed.success) {
                    throw new Error(`Invalid task record: ${JSON.stringify(raw)}`);
                }
                tasks.push(parsed.data.id);
            }
        }

        const syncCommentsForScopes = async ({
            phase,
            scopeIds,
            paramName
        }: {
            phase: 'project' | 'task';
            scopeIds: string[];
            paramName: 'project_id' | 'task_id';
        }) => {
            const resumeScopeId = checkpoint?.phase === phase ? checkpoint.scope_id : undefined;
            const resumeCursor = checkpoint?.phase === phase && checkpoint.cursor_active ? checkpoint.cursor : undefined;
            let shouldProcess = !resumeScopeId || !scopeIds.includes(resumeScopeId);

            for (const scopeId of scopeIds) {
                if (!shouldProcess) {
                    if (scopeId !== resumeScopeId) {
                        continue;
                    }
                    shouldProcess = true;
                }

                let cursor = scopeId === resumeScopeId ? resumeCursor : undefined;

                await nango.saveCheckpoint({
                    phase,
                    scope_id: scopeId,
                    cursor: cursor ?? '',
                    cursor_active: cursor !== undefined
                });

                const commentConfig: ProxyConfiguration = {
                    // https://developer.todoist.com/api/v1
                    endpoint: '/api/v1/comments',
                    params: {
                        [paramName]: scopeId,
                        ...(cursor && { cursor })
                    },
                    paginate: {
                        type: 'cursor',
                        cursor_name_in_request: 'cursor',
                        cursor_path_in_response: 'next_cursor',
                        response_path: 'results',
                        limit_name_in_request: 'limit',
                        limit: LIMIT,
                        on_page: async ({ nextPageParam }) => {
                            cursor = typeof nextPageParam === 'string' ? nextPageParam : undefined;
                        }
                    },
                    retries: 3
                };

                for await (const page of nango.paginate(commentConfig)) {
                    const comments: Array<z.infer<typeof CommentSchema>> = [];
                    for (const raw of page) {
                        const parsed = ProviderCommentSchema.safeParse(raw);
                        if (!parsed.success) {
                            throw new Error(`Invalid comment record: ${JSON.stringify(raw)}`);
                        }
                        comments.push(toCommentRecord(parsed.data));
                    }

                    if (comments.length > 0) {
                        await nango.batchSave(comments, 'Comment');
                    }

                    if (cursor !== undefined) {
                        await nango.saveCheckpoint({
                            phase,
                            scope_id: scopeId,
                            cursor,
                            cursor_active: true
                        });
                    }
                }
            }
        };

        if (checkpoint?.phase !== 'task') {
            await syncCommentsForScopes({
                phase: 'project',
                scopeIds: projects,
                paramName: 'project_id'
            });
        }

        await syncCommentsForScopes({
            phase: 'task',
            scopeIds: tasks,
            paramName: 'task_id'
        });

        await nango.clearCheckpoint();
        await nango.trackDeletesEnd('Comment');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
