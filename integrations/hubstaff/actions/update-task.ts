import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    task_id: z.string().describe('Task ID. Example: "165909246"'),
    summary: z.string().optional().describe('Updated task summary.'),
    status: z.string().optional().describe('Updated task status. Example: "active", "done", or "deleted".'),
    assignee_id: z.number().optional().describe('Updated assignee user ID.'),
    billable: z.boolean().optional().describe('Whether the task is billable.')
});

const ProviderTaskSchema = z
    .object({
        id: z.number(),
        summary: z.string().optional(),
        status: z.string().optional(),
        lock_version: z.number(),
        assignee_ids: z.array(z.number()).optional(),
        billable: z.boolean().optional(),
        project_id: z.number().optional(),
        created_at: z.string().optional(),
        updated_at: z.string().optional()
    })
    .passthrough();

const OutputSchema = z.object({
    id: z.string(),
    summary: z.string().optional(),
    status: z.string().optional(),
    lock_version: z.number(),
    assignee_ids: z.array(z.number()).optional(),
    billable: z.boolean().optional(),
    project_id: z.number().optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional()
});

const action = createAction({
    description: "Update a task's summary or other fields.",
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['tasks:read', 'tasks:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        if (input.summary === undefined && input.status === undefined && input.assignee_id === undefined && input.billable === undefined) {
            throw new nango.ActionError({
                type: 'invalid_input',
                message: 'At least one of summary, status, assignee_id, or billable must be provided.'
            });
        }

        const getResponse = await nango.get({
            // https://developer.hubstaff.com/
            endpoint: `v2/tasks/${encodeURIComponent(input.task_id)}`,
            retries: 3
        });

        const getWrapper = z.object({ task: ProviderTaskSchema }).parse(getResponse.data);
        const existingTask = getWrapper.task;
        const currentLockVersion = existingTask.lock_version;

        const updateBody: Record<string, unknown> = {
            lock_version: currentLockVersion
        };

        if (input.summary !== undefined) {
            updateBody['summary'] = input.summary;
        }
        if (input.status !== undefined) {
            updateBody['status'] = input.status;
        }
        if (input.assignee_id !== undefined) {
            updateBody['assignee_id'] = input.assignee_id;
        }
        if (input.billable !== undefined) {
            updateBody['billable'] = input.billable;
        }

        const putResponse = await nango.put({
            // https://developer.hubstaff.com/
            endpoint: `v2/tasks/${encodeURIComponent(input.task_id)}`,
            data: updateBody,
            retries: 1
        });

        const putWrapper = z.object({ task: ProviderTaskSchema }).parse(putResponse.data);
        const updatedTask = putWrapper.task;

        return {
            id: String(updatedTask.id),
            lock_version: updatedTask.lock_version,
            ...(updatedTask.summary !== undefined && { summary: updatedTask.summary }),
            ...(updatedTask.status !== undefined && { status: updatedTask.status }),
            ...(updatedTask.assignee_ids !== undefined && { assignee_ids: updatedTask.assignee_ids }),
            ...(updatedTask.billable !== undefined && { billable: updatedTask.billable }),
            ...(updatedTask.project_id !== undefined && { project_id: updatedTask.project_id }),
            ...(updatedTask.created_at !== undefined && { created_at: updatedTask.created_at }),
            ...(updatedTask.updated_at !== undefined && { updated_at: updatedTask.updated_at })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
