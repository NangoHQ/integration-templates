import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    task_id: z.string().describe('Task ID. Example: "6h78Phpj8jH59jWq"')
});

const ProviderTaskSchema = z.object({
    id: z.string(),
    content: z.string(),
    description: z.string().optional(),
    project_id: z.string(),
    section_id: z.string().nullable().optional(),
    parent_id: z.string().nullable().optional(),
    labels: z.array(z.string()).optional(),
    priority: z.number().optional(),
    order: z.number().optional(),
    is_completed: z.boolean().optional(),
    created_at: z.string().optional(),
    creator_id: z.string().optional(),
    assignee_id: z.string().nullable().optional(),
    assigner_id: z.string().nullable().optional(),
    completed_at: z.string().nullable().optional(),
    due: z
        .object({
            date: z.string(),
            datetime: z.string().nullable().optional(),
            string: z.string(),
            lang: z.string().optional()
        })
        .nullable()
        .optional(),
    duration: z
        .object({
            amount: z.number(),
            unit: z.string()
        })
        .nullable()
        .optional(),
    deadline: z
        .object({
            date: z.string(),
            lang: z.string().optional()
        })
        .nullable()
        .optional(),
    url: z.string().optional()
});

const OutputSchema = ProviderTaskSchema;

const action = createAction({
    description: 'Retrieve a single task.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['task:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://developer.todoist.com/api/v1/#get-task
            endpoint: `/api/v1/tasks/${encodeURIComponent(input.task_id)}`,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Task not found',
                task_id: input.task_id
            });
        }

        const task = ProviderTaskSchema.parse(response.data);
        return task;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
