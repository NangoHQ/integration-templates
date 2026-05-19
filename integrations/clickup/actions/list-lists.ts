import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        folder_id: z.string().min(1).optional().describe('Folder ID to list lists within. Provide either folder_id or space_id, not both.'),
        space_id: z
            .string()
            .min(1)
            .optional()
            .describe('Space ID to list folderless lists directly in the space. Provide either folder_id or space_id, not both.'),
        archived: z.boolean().optional().describe('Whether to include archived lists. Default: false.')
    })
    .refine(
        (data) => {
            const hasFolder = data.folder_id !== undefined;
            const hasSpace = data.space_id !== undefined;
            return (hasFolder && !hasSpace) || (!hasFolder && hasSpace);
        },
        {
            message: 'Provide either folder_id or space_id, but not both.'
        }
    );

const ListSchema = z.object({
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
    assignee: z.string().nullable().optional(),
    task_count: z.number().optional(),
    due_date: z.string().nullable().optional(),
    start_date: z.string().nullable().optional(),
    folder: z
        .object({
            id: z.string().optional(),
            name: z.string().optional(),
            hidden: z.boolean().optional(),
            access: z.boolean().optional()
        })
        .nullable()
        .optional(),
    space: z
        .object({
            id: z.string().optional(),
            name: z.string().optional()
        })
        .nullable()
        .optional(),
    archived: z.boolean().optional(),
    override_statuses: z.boolean().optional(),
    permission_level: z.string().optional()
});

const ProviderResponseSchema = z.object({
    lists: z.array(ListSchema.passthrough())
});

const OutputListSchema = z.object({
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
        .optional(),
    priority: z
        .object({
            priority: z.string().optional(),
            color: z.string().optional()
        })
        .optional(),
    assignee: z.string().optional(),
    task_count: z.number().optional(),
    due_date: z.string().optional(),
    start_date: z.string().optional(),
    folder: z
        .object({
            id: z.string().optional(),
            name: z.string().optional(),
            hidden: z.boolean().optional(),
            access: z.boolean().optional()
        })
        .optional(),
    space: z
        .object({
            id: z.string().optional(),
            name: z.string().optional()
        })
        .optional(),
    archived: z.boolean().optional(),
    override_statuses: z.boolean().optional(),
    permission_level: z.string().optional()
});

const OutputSchema = z.object({
    lists: z.array(OutputListSchema)
});

const action = createAction({
    description: 'List lists from ClickUp',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/list-lists',
        group: 'Lists'
    },
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        let response;

        if (input.folder_id) {
            response = await nango.get({
                // https://developer.clickup.com/reference/lists/getfolderlists
                endpoint: `/api/v2/folder/${encodeURIComponent(input.folder_id)}/list`,
                params: {
                    ...(input.archived !== undefined && { archived: String(input.archived) })
                },
                retries: 3
            });
        } else {
            response = await nango.get({
                // https://developer.clickup.com/reference/lists/getspacefolderlesslists
                endpoint: `/api/v2/space/${encodeURIComponent(input.space_id || '')}/list`,
                params: {
                    ...(input.archived !== undefined && { archived: String(input.archived) })
                },
                retries: 3
            });
        }

        const providerResponse = ProviderResponseSchema.parse(response.data);

        return {
            lists: providerResponse.lists.map((list) => ({
                id: list.id,
                name: list.name,
                orderindex: list.orderindex,
                ...(list.content != null && { content: list.content }),
                ...(list.status != null && { status: list.status }),
                ...(list.priority != null && { priority: list.priority }),
                ...(list.assignee != null && { assignee: list.assignee }),
                ...(list.task_count !== undefined && { task_count: list.task_count }),
                ...(list.due_date != null && { due_date: list.due_date }),
                ...(list.start_date != null && { start_date: list.start_date }),
                ...(list.folder != null && { folder: list.folder }),
                ...(list.space != null && { space: list.space }),
                ...(list.archived !== undefined && { archived: list.archived }),
                ...(list.override_statuses !== undefined && { override_statuses: list.override_statuses }),
                ...(list.permission_level !== undefined && { permission_level: list.permission_level })
            }))
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
