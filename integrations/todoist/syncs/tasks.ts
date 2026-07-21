import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const LIMIT = 100;

const ProviderTaskSchema = z.object({
    id: z.string(),
    content: z.string(),
    description: z.string(),
    project_id: z.string(),
    section_id: z.string().nullable().optional(),
    parent_id: z.string().nullable().optional(),
    labels: z.array(z.string()),
    priority: z.number(),
    due: z.record(z.string(), z.unknown()).nullable().optional(),
    duration: z.record(z.string(), z.unknown()).nullable().optional(),
    responsible_uid: z.string().nullable().optional(),
    assigned_by_uid: z.string().nullable().optional(),
    added_by_uid: z.string().optional(),
    added_at: z.string().optional(),
    updated_at: z.string().nullable().optional()
});

const TaskModelSchema = z.object({
    id: z.string(),
    content: z.string(),
    description: z.string(),
    project_id: z.string(),
    section_id: z.string().optional(),
    parent_id: z.string().optional(),
    labels: z.array(z.string()),
    priority: z.number(),
    due: z.record(z.string(), z.unknown()).optional(),
    duration: z.record(z.string(), z.unknown()).optional(),
    responsible_uid: z.string().optional(),
    assigned_by_uid: z.string().optional(),
    added_by_uid: z.string().optional(),
    added_at: z.string().optional(),
    updated_at: z.string().optional()
});

const CheckpointSchema = z.object({
    cursor: z.string()
});

const sync = createSync({
    description: 'Sync active (non-completed) tasks.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        Task: TaskModelSchema
    },

    exec: async (nango) => {
        const rawCheckpoint = await nango.getCheckpoint();
        const checkpoint = rawCheckpoint ? CheckpointSchema.parse(rawCheckpoint) : undefined;

        // GET /api/v1/tasks does not support any changed-since filter, so this
        // remains a full refresh. The provider cursor still lets us resume an
        // interrupted crawl mid-snapshot before delete tracking completes.
        let cursor = checkpoint?.cursor;

        await nango.trackDeletesStart('Task');

        const proxyConfig: ProxyConfiguration = {
            // https://developer.todoist.com/api/v1/#get-active-tasks
            endpoint: '/api/v1/tasks',
            params: {
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

        for await (const page of nango.paginate(proxyConfig)) {
            const tasks = page.map((raw) => {
                const parsed = ProviderTaskSchema.parse(raw);
                return {
                    id: parsed.id,
                    content: parsed.content,
                    description: parsed.description,
                    project_id: parsed.project_id,
                    ...(parsed.section_id != null && { section_id: parsed.section_id }),
                    ...(parsed.parent_id != null && { parent_id: parsed.parent_id }),
                    labels: parsed.labels,
                    priority: parsed.priority,
                    ...(parsed.due != null && { due: parsed.due }),
                    ...(parsed.duration != null && { duration: parsed.duration }),
                    ...(parsed.responsible_uid != null && { responsible_uid: parsed.responsible_uid }),
                    ...(parsed.assigned_by_uid != null && { assigned_by_uid: parsed.assigned_by_uid }),
                    ...(parsed.added_by_uid != null && { added_by_uid: parsed.added_by_uid }),
                    ...(parsed.added_at != null && { added_at: parsed.added_at }),
                    ...(parsed.updated_at != null && { updated_at: parsed.updated_at })
                };
            });

            if (tasks.length > 0) {
                await nango.batchSave(tasks, 'Task');
            }

            if (cursor !== undefined) {
                await nango.saveCheckpoint({ cursor });
            }
        }

        await nango.clearCheckpoint();
        await nango.trackDeletesEnd('Task');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
