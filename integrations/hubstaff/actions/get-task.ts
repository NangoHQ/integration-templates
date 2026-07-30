import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    taskId: z.string().describe('Task ID. Example: "165909246"')
});

const ProviderTaskSchema = z
    .object({
        id: z.number().describe('Task ID. Example: 165909246'),
        summary: z.string().nullable().optional(),
        status: z.string().nullable().optional(),
        project_id: z.number().nullable().optional(),
        project_type: z.string().nullable().optional(),
        assignee_id: z.number().nullable().optional(),
        assignee_ids: z.number().array().nullable().optional(),
        due_at: z.string().nullable().optional(),
        created_at: z.string().nullable().optional(),
        updated_at: z.string().nullable().optional(),
        deleted_at: z.string().nullable().optional(),
        completed_at: z.string().nullable().optional(),
        lock_version: z.number().nullable().optional(),
        source: z.string().nullable().optional(),
        budget: z.number().nullable().optional(),
        metadata: z.record(z.string(), z.unknown()).nullable().optional()
    })
    .passthrough();

const ProviderResponseSchema = z.object({
    task: ProviderTaskSchema
});

const OutputSchema = z.object({
    id: z.number(),
    summary: z.string().optional(),
    status: z.string().optional(),
    project_id: z.number().optional(),
    project_type: z.string().optional(),
    assignee_id: z.number().optional(),
    assignee_ids: z.number().array().optional(),
    due_at: z.string().optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional(),
    deleted_at: z.string().optional(),
    completed_at: z.string().optional(),
    lock_version: z.number().optional(),
    source: z.string().optional(),
    budget: z.number().optional(),
    metadata: z.record(z.string(), z.unknown()).optional()
});

const action = createAction({
    description: 'Get a single task by id.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['tasks:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developer.hubstaff.com/
        const response = await nango.get({
            endpoint: `v2/tasks/${encodeURIComponent(input.taskId)}`,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Task not found',
                taskId: input.taskId
            });
        }

        const providerResponse = ProviderResponseSchema.parse(response.data);
        const task = providerResponse.task;

        return {
            id: task.id,
            ...(task.summary != null && { summary: task.summary }),
            ...(task.status != null && { status: task.status }),
            ...(task.project_id != null && { project_id: task.project_id }),
            ...(task.project_type != null && { project_type: task.project_type }),
            ...(task.assignee_id != null && { assignee_id: task.assignee_id }),
            ...(task.assignee_ids != null && { assignee_ids: task.assignee_ids }),
            ...(task.due_at != null && { due_at: task.due_at }),
            ...(task.created_at != null && { created_at: task.created_at }),
            ...(task.updated_at != null && { updated_at: task.updated_at }),
            ...(task.deleted_at != null && { deleted_at: task.deleted_at }),
            ...(task.completed_at != null && { completed_at: task.completed_at }),
            ...(task.lock_version != null && { lock_version: task.lock_version }),
            ...(task.source != null && { source: task.source }),
            ...(task.budget != null && { budget: task.budget }),
            ...(task.metadata != null && { metadata: task.metadata })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
