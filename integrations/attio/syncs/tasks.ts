import { createSync } from 'nango';
import { z } from 'zod';

const TaskIdSchema = z.object({
    workspace_id: z.string(),
    task_id: z.string()
});

const LinkedRecordSchema = z.object({
    target_object_id: z.string(),
    target_record_id: z.string()
});

const AssigneeSchema = z.object({
    referenced_actor_type: z.string(),
    referenced_actor_id: z.string()
});

const CreatedByActorSchema = z.object({
    type: z.string(),
    id: z.string()
});

const ProviderTaskSchema = z.object({
    id: TaskIdSchema,
    content_plaintext: z.string(),
    deadline_at: z.string().nullable().optional(),
    is_completed: z.boolean(),
    completed_at: z.string().nullable().optional(),
    linked_records: z.array(LinkedRecordSchema).optional(),
    assignees: z.array(AssigneeSchema).optional(),
    created_by_actor: CreatedByActorSchema,
    created_at: z.string()
});

const TaskSchema = z.object({
    id: z.string(),
    content_plaintext: z.string(),
    deadline_at: z.string().optional(),
    is_completed: z.boolean(),
    completed_at: z.string().optional(),
    linked_records: z.array(LinkedRecordSchema).optional(),
    assignees: z.array(AssigneeSchema).optional(),
    created_by_actor: CreatedByActorSchema,
    created_at: z.string()
});

const CheckpointSchema = z.object({
    offset: z.number().int().nonnegative(),
    in_progress: z.boolean()
});

type TaskModel = typeof TaskSchema;
type CheckpointModel = typeof CheckpointSchema;

const sync = createSync<Record<'Task', TaskModel>, undefined, CheckpointModel>({
    description: 'Sync tasks from Attio',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    endpoints: [
        {
            method: 'GET',
            path: '/syncs/tasks'
        }
    ],
    checkpoint: CheckpointSchema,
    models: {
        Task: TaskSchema
    },

    exec: async (nango) => {
        const checkpoint = CheckpointSchema.partial().parse((await nango.getCheckpoint()) ?? {});
        let offset = checkpoint.offset ?? 0;
        const inProgress = checkpoint.in_progress ?? false;
        const limit = 500;
        let hasMore = true;

        if (!inProgress) {
            await nango.trackDeletesStart('Task');
        }

        while (hasMore) {
            // https://docs.attio.com/reference/get_v2_tasks
            const response = await nango.get({
                endpoint: '/v2/tasks',
                params: {
                    limit: limit,
                    offset: offset,
                    sort: 'created_at:asc'
                },
                retries: 3
            });

            const rawData = response.data;
            if (!rawData || typeof rawData !== 'object' || !Array.isArray(rawData.data)) {
                throw new Error('Invalid tasks response from provider');
            }

            const items = rawData.data;
            const tasks: Array<z.infer<TaskModel>> = [];

            for (const item of items) {
                const parseResult = ProviderTaskSchema.safeParse(item);
                if (!parseResult.success) {
                    continue;
                }

                const task = parseResult.data;
                tasks.push({
                    id: task.id.task_id,
                    content_plaintext: task.content_plaintext,
                    ...(task.deadline_at && { deadline_at: task.deadline_at }),
                    is_completed: task.is_completed,
                    ...(task.completed_at && { completed_at: task.completed_at }),
                    ...(task.linked_records && { linked_records: task.linked_records }),
                    ...(task.assignees && { assignees: task.assignees }),
                    created_by_actor: task.created_by_actor,
                    created_at: task.created_at
                });
            }

            if (tasks.length > 0) {
                await nango.batchSave(tasks, 'Task');
            }

            if (items.length < limit) {
                hasMore = false;
            } else {
                offset += limit;
                await nango.saveCheckpoint({ offset, in_progress: true });
            }
        }

        await nango.trackDeletesEnd('Task');
        await nango.clearCheckpoint();
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
