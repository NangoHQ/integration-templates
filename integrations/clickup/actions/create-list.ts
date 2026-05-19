import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    name: z.string().describe('The name of the list to create. Example: "My List"'),
    folder_id: z
        .string()
        .optional()
        .describe(
            'The ID of the folder to create the list in. Use this to create a list inside a folder. Either folder_id or space_id must be provided. Example: "901516078072"'
        ),
    space_id: z
        .string()
        .optional()
        .describe(
            'The ID of the space to create the list in. Use this to create a folderless list directly in a space. Either folder_id or space_id must be provided. Example: "901511023376"'
        ),
    content: z.string().optional().describe('The description or content of the list.'),
    due_date: z.number().optional().describe('The due date for the list in milliseconds since epoch.'),
    due_date_time: z.boolean().optional().describe('Whether the due_date includes time information.'),
    priority: z.number().optional().describe('The priority level of the list (1-4, where 1 is Urgent).'),
    assignee: z.number().optional().describe('The user ID to assign to this list.'),
    status: z.string().optional().describe('The status of the list (refers to list color, not task statuses).')
});

const ListStatusSchema = z.object({
    id: z.string(),
    status: z.string(),
    orderindex: z.number(),
    color: z.string(),
    type: z.string()
});

const ProviderListSchema = z.object({
    id: z.string(),
    name: z.string(),
    orderindex: z.number(),
    content: z.string().optional(),
    status: z
        .object({
            status: z.string().optional(),
            color: z.string().optional(),
            hide_label: z.boolean().optional()
        })
        .nullable()
        .optional(),
    priority: z
        .object({
            priority: z.string().optional(),
            color: z.string().optional()
        })
        .nullable()
        .optional(),
    assignee: z
        .object({
            id: z.number().optional(),
            username: z.string().optional(),
            email: z.string().optional()
        })
        .nullable()
        .optional(),
    due_date: z.string().nullable().optional(),
    due_date_time: z.boolean().nullable().optional(),
    folder: z
        .object({
            id: z.string(),
            name: z.string()
        })
        .optional(),
    space: z.object({
        id: z.string(),
        name: z.string()
    }),
    statuses: z.array(ListStatusSchema).optional()
});

const OutputSchema = z.object({
    id: z.string(),
    name: z.string(),
    folder: z
        .object({
            id: z.string(),
            name: z.string()
        })
        .optional(),
    space: z.object({
        id: z.string(),
        name: z.string()
    }),
    statuses: z
        .array(
            z.object({
                id: z.string(),
                status: z.string(),
                orderindex: z.number(),
                color: z.string(),
                type: z.string()
            })
        )
        .optional()
});

const action = createAction({
    description: 'Create a list in ClickUp',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/create-list',
        group: 'Lists'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        if (!input.folder_id && !input.space_id) {
            throw new nango.ActionError({
                type: 'validation_error',
                message: 'Either folder_id or space_id must be provided to create a list'
            });
        }

        const requestBody: Record<string, unknown> = {
            name: input.name
        };

        if (input.content !== undefined) {
            requestBody['content'] = input.content;
        }
        if (input.due_date !== undefined) {
            requestBody['due_date'] = input.due_date;
        }
        if (input.due_date_time !== undefined) {
            requestBody['due_date_time'] = input.due_date_time;
        }
        if (input.priority !== undefined) {
            requestBody['priority'] = input.priority;
        }
        if (input.assignee !== undefined) {
            requestBody['assignee'] = input.assignee;
        }
        if (input.status !== undefined) {
            requestBody['status'] = input.status;
        }

        let response;

        if (input.folder_id) {
            // https://developer.clickup.com/reference/createlist
            response = await nango.post({
                endpoint: `/api/v2/folder/${encodeURIComponent(input.folder_id)}/list`,
                data: requestBody,
                retries: 3
            });
        } else if (input.space_id) {
            // https://developer.clickup.com/reference/createfolderlesslist
            response = await nango.post({
                endpoint: `/api/v2/space/${encodeURIComponent(input.space_id)}/list`,
                data: requestBody,
                retries: 3
            });
        }

        if (!response || !response.data) {
            throw new nango.ActionError({
                type: 'api_error',
                message: 'Empty response from ClickUp API'
            });
        }

        const list = ProviderListSchema.parse(response.data);

        return {
            id: list.id,
            name: list.name,
            ...(list.folder && { folder: list.folder }),
            space: list.space,
            ...(list.statuses && {
                statuses: list.statuses.map((s) => ({
                    id: s.id,
                    status: s.status,
                    orderindex: s.orderindex,
                    color: s.color,
                    type: s.type
                }))
            })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
