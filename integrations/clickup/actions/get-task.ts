import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        task_id: z.string().describe('The ClickUp task ID. Example: "86c9w2nke"'),
        custom_task_ids: z.boolean().optional().describe('Set to true when using custom task IDs instead of ClickUp native IDs.'),
        team_id: z.string().optional().describe('ClickUp team/workspace ID. Required when custom_task_ids is true. Example: "90152560096"')
    })
    .refine((data) => !data.custom_task_ids || data.team_id, {
        message: 'team_id is required when custom_task_ids is true',
        path: ['team_id']
    });

// Provider schema matching ClickUp API v2 task response
const ProviderTaskSchema = z.object({
    id: z.string(),
    name: z.string(),
    status: z
        .object({
            status: z.string(),
            color: z.string().optional(),
            orderindex: z.number().optional(),
            type: z.string().optional()
        })
        .optional(),
    priority: z
        .object({
            priority: z.string(),
            color: z.string().optional()
        })
        .optional()
        .nullable(),
    assignees: z
        .array(
            z.object({
                id: z.number(),
                username: z.string().optional(),
                email: z.string().optional(),
                color: z.string().optional(),
                profilePicture: z.string().optional()
            })
        )
        .optional(),
    due_date: z.string().optional().nullable(),
    start_date: z.string().optional().nullable(),
    time_estimate: z.number().optional().nullable(),
    time_spent: z.number().optional().nullable(),
    tags: z.array(z.object({ name: z.string() })).optional(),
    list: z
        .object({
            id: z.string(),
            name: z.string()
        })
        .optional(),
    folder: z
        .object({
            id: z.string(),
            name: z.string()
        })
        .optional()
        .nullable(),
    space: z
        .object({
            id: z.string(),
            name: z.string().optional()
        })
        .optional(),
    attachments: z
        .array(
            z.object({
                id: z.string(),
                title: z.string().optional(),
                url: z.string().optional()
            })
        )
        .optional()
});

const OutputSchema = z.object({
    id: z.string(),
    name: z.string(),
    status: z
        .object({
            status: z.string(),
            color: z.string().optional(),
            orderindex: z.number().optional(),
            type: z.string().optional()
        })
        .optional(),
    priority: z
        .object({
            priority: z.string(),
            color: z.string().optional()
        })
        .optional(),
    assignees: z
        .array(
            z.object({
                id: z.number(),
                username: z.string().optional(),
                email: z.string().optional(),
                color: z.string().optional(),
                profilePicture: z.string().optional()
            })
        )
        .optional(),
    due_date: z.string().optional(),
    start_date: z.string().optional(),
    time_estimate: z.number().optional(),
    time_spent: z.number().optional(),
    tags: z.array(z.object({ name: z.string() })).optional(),
    list: z
        .object({
            id: z.string(),
            name: z.string()
        })
        .optional(),
    folder: z
        .object({
            id: z.string(),
            name: z.string()
        })
        .optional(),
    space: z
        .object({
            id: z.string(),
            name: z.string().optional()
        })
        .optional(),
    attachments: z
        .array(
            z.object({
                id: z.string(),
                title: z.string().optional(),
                url: z.string().optional()
            })
        )
        .optional()
});

const action = createAction({
    description: 'Retrieve a single task from ClickUp.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['read'], // Read-only operation

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const params: Record<string, string> = {};
        if (input.custom_task_ids) {
            params['custom_task_ids'] = 'true';
            params['team_id'] = input.team_id!;
        }

        // https://developer.clickup.com/reference/get-task
        const response = await nango.get({
            endpoint: `/api/v2/task/${encodeURIComponent(input.task_id)}`,
            params,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: `Task with ID "${input.task_id}" was not found.`,
                task_id: input.task_id
            });
        }

        const providerTask = ProviderTaskSchema.parse(response.data);

        return {
            id: providerTask.id,
            name: providerTask.name,
            ...(providerTask.status !== undefined && {
                status: providerTask.status
            }),
            ...(providerTask.priority != null && {
                priority: providerTask.priority
            }),
            ...(providerTask.assignees !== undefined && {
                assignees: providerTask.assignees
            }),
            ...(providerTask.due_date != null && {
                due_date: providerTask.due_date
            }),
            ...(providerTask.start_date != null && {
                start_date: providerTask.start_date
            }),
            ...(providerTask.time_estimate != null && {
                time_estimate: providerTask.time_estimate
            }),
            ...(providerTask.time_spent != null && {
                time_spent: providerTask.time_spent
            }),
            ...(providerTask.tags !== undefined && {
                tags: providerTask.tags
            }),
            ...(providerTask.list !== undefined && {
                list: providerTask.list
            }),
            ...(providerTask.folder != null && {
                folder: providerTask.folder
            }),
            ...(providerTask.space !== undefined && {
                space: providerTask.space
            }),
            ...(providerTask.attachments !== undefined && {
                attachments: providerTask.attachments
            })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
