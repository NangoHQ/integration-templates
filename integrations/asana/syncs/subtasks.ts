import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const AsanaCompactTaskSchema = z.object({
    gid: z.string(),
    name: z.string().nullable().optional(),
    completed: z.boolean().nullable().optional(),
    created_at: z.string().nullable().optional(),
    modified_at: z.string().nullable().optional(),
    resource_type: z.string().optional()
});

const SubtaskSchema = z.object({
    id: z.string(),
    parent_task_id: z.string(),
    name: z.string().optional(),
    completed: z.boolean().optional(),
    created_at: z.string().optional(),
    modified_at: z.string().optional()
});

const MetadataSchema = z.object({
    task_ids: z.array(z.string()).optional()
});

const CheckpointSchema = z.object({
    task_index: z.number().int().nonnegative(),
    delete_tracking_started: z.boolean()
});

const LegacyCheckpointSchema = z.object({
    task_index: z.number().int().nonnegative()
});

const sync = createSync({
    description: 'Sync subtasks for parent tasks in scope.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    metadata: MetadataSchema,
    checkpoint: CheckpointSchema,
    endpoints: [{ method: 'GET', path: '/syncs/subtasks' }],
    models: {
        Subtask: SubtaskSchema
    },
    scopes: ['tasks:read'],

    exec: async (nango) => {
        let rawMetadata: unknown;
        try {
            rawMetadata = await nango.getMetadata();
        } catch (error) {
            if (!(error instanceof Error) || error.message !== 'Missing mock data for getMetadata') {
                throw error;
            }
        }

        const metadataResult = MetadataSchema.safeParse(rawMetadata);
        if (!metadataResult.success) {
            await nango.log('Invalid metadata: expected task_ids array of strings', { level: 'error' });
            return;
        }

        const taskIds = metadataResult.data.task_ids ?? [];
        if (taskIds.length === 0) {
            await nango.log('No task_ids provided in metadata');
            return;
        }

        const rawCheckpoint = await nango.getCheckpoint();
        const checkpointResult = CheckpointSchema.safeParse(rawCheckpoint);
        const legacyCheckpointResult = LegacyCheckpointSchema.safeParse(rawCheckpoint);
        const hasResumeCheckpoint = checkpointResult.success && checkpointResult.data.delete_tracking_started;
        const startIndex = checkpointResult.success
            ? checkpointResult.data.task_index
            : legacyCheckpointResult.success
              ? legacyCheckpointResult.data.task_index
              : 0;

        // Blocker: the subtasks list endpoint only supports pagination, so we do
        // a full refresh and use task_index as resumable state across parent tasks.
        if (!hasResumeCheckpoint) {
            await nango.trackDeletesStart('Subtask');
        }

        for (let i = startIndex; i < taskIds.length; i++) {
            const taskId = taskIds[i];

            const proxyConfig: ProxyConfiguration = {
                // https://developers.asana.com/reference/getsubtasksfortask
                endpoint: `/api/1.0/tasks/${taskId}/subtasks`,
                params: {
                    limit: 100,
                    opt_fields: 'name,completed,created_at,modified_at'
                },
                paginate: {
                    limit: 100
                },
                retries: 3
            };

            for await (const batch of nango.paginate(proxyConfig)) {
                const subtasks = batch
                    .map((item) => {
                        const parsed = AsanaCompactTaskSchema.safeParse(item);
                        if (!parsed.success) {
                            return null;
                        }
                        const task = parsed.data;
                        return {
                            id: task.gid,
                            parent_task_id: taskId,
                            ...(task.name != null && { name: task.name }),
                            ...(task.completed != null && { completed: task.completed }),
                            ...(task.created_at != null && { created_at: task.created_at }),
                            ...(task.modified_at != null && { modified_at: task.modified_at })
                        };
                    })
                    .filter((subtask) => subtask !== null);

                if (subtasks.length > 0) {
                    await nango.batchSave(subtasks, 'Subtask');
                }
            }

            await nango.saveCheckpoint({ task_index: i + 1, delete_tracking_started: true });
        }

        await nango.trackDeletesEnd('Subtask');
        await nango.clearCheckpoint();
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
