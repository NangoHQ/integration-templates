import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('Task ID. Example: "task_xxx"')
});

const ProviderTaskSchema = z
    .object({
        id: z.string(),
        _type: z.string(),
        assigned_to: z.string().nullable().optional(),
        is_complete: z.boolean(),
        priority: z.enum(['low', 'medium', 'high']).nullable().optional(),
        due_date: z.string().nullable().optional(),
        lead_id: z.string().nullable().optional()
    })
    .passthrough();

const OutputSchema = z
    .object({
        id: z.string(),
        _type: z.string(),
        assigned_to: z.string().optional(),
        is_complete: z.boolean(),
        priority: z.enum(['low', 'medium', 'high']).optional(),
        due_date: z.string().optional(),
        lead_id: z.string().optional()
    })
    .passthrough();

const action = createAction({
    description: 'Retrieve a single task by ID.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://developer.close.com/api/resources/tasks/get/
            endpoint: `/v1/task/${encodeURIComponent(input.id)}/`,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Task not found',
                id: input.id
            });
        }

        const providerTask = ProviderTaskSchema.parse(response.data);

        const output: Record<string, unknown> = {
            id: providerTask.id,
            _type: providerTask._type,
            is_complete: providerTask.is_complete
        };

        if (providerTask.assigned_to != null) {
            output['assigned_to'] = providerTask.assigned_to;
        }

        if (providerTask.priority != null) {
            output['priority'] = providerTask.priority;
        }

        if (providerTask.due_date != null) {
            output['due_date'] = providerTask.due_date;
        }

        if (providerTask.lead_id != null) {
            output['lead_id'] = providerTask.lead_id;
        }

        for (const [key, value] of Object.entries(providerTask)) {
            if (!(key in output) && value !== null) {
                output[key] = value;
            }
        }

        return OutputSchema.parse(output);
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
