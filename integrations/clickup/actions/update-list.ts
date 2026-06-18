import { z } from 'zod';
import { createAction } from 'nango';

// Input schema for updating a list
const InputSchema = z
    .object({
        list_id: z.string().describe('The ID of the list to update. Example: "901523451693"'),
        name: z.string().optional().describe('The new name of the list.'),
        content: z.string().optional().describe('The new content/description of the list.'),
        due_date: z.number().optional().describe('The due date as a Unix timestamp in milliseconds.'),
        due_date_time: z.boolean().optional().describe('Whether the due_date includes a time component.'),
        priority: z.number().optional().describe('The priority of the list (1-4, where 1 is Urgent).'),
        assignee: z.number().optional().describe('The user ID to assign the list to.'),
        status: z.string().optional().describe('The status of the list.'),
        unset_status: z.boolean().optional().describe('Whether to unset the status.')
    })
    .refine(
        (data) =>
            data.name !== undefined ||
            data.content !== undefined ||
            data.due_date !== undefined ||
            data.due_date_time !== undefined ||
            data.priority !== undefined ||
            data.assignee !== undefined ||
            data.status !== undefined ||
            data.unset_status !== undefined,
        {
            message: 'At least one field to update must be provided besides list_id'
        }
    );

// Provider response schema for a list
const ProviderListSchema = z.object({
    id: z.string(),
    name: z.string(),
    content: z.string().optional(),
    orderindex: z.number().optional(),
    status: z.string().nullable().optional(),
    priority: z.number().nullable().optional(),
    assignee: z.number().nullable().optional(),
    due_date: z.string().nullable().optional(),
    start_date: z.string().nullable().optional(),
    folder: z
        .object({
            id: z.string(),
            name: z.string(),
            hidden: z.boolean().optional(),
            access: z.boolean().optional()
        })
        .nullable()
        .optional(),
    space: z
        .object({
            id: z.string()
        })
        .optional(),
    archived: z.boolean().optional(),
    override_statuses: z.boolean().optional(),
    permission_level: z.string().optional()
});

// Output schema for the action
const OutputSchema = z.object({
    id: z.string(),
    name: z.string(),
    content: z.string().optional(),
    orderindex: z.number().optional(),
    status: z.string().optional(),
    priority: z.number().optional(),
    assignee: z.number().optional(),
    due_date: z.string().optional(),
    start_date: z.string().optional(),
    folder: z
        .object({
            id: z.string(),
            name: z.string(),
            hidden: z.boolean().optional(),
            access: z.boolean().optional()
        })
        .optional(),
    space: z
        .object({
            id: z.string()
        })
        .optional(),
    archived: z.boolean().optional(),
    override_statuses: z.boolean().optional(),
    permission_level: z.string().optional()
});

const action = createAction({
    description: 'Update a list in ClickUp.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developer.clickup.com/reference/updatelist
        const response = await nango.put({
            endpoint: `/api/v2/list/${encodeURIComponent(input.list_id)}`,
            data: {
                ...(input.name !== undefined && { name: input.name }),
                ...(input.content !== undefined && { content: input.content }),
                ...(input.due_date !== undefined && { due_date: input.due_date }),
                ...(input.due_date_time !== undefined && { due_date_time: input.due_date_time }),
                ...(input.priority !== undefined && { priority: input.priority }),
                ...(input.assignee !== undefined && { assignee: input.assignee }),
                ...(input.status !== undefined && { status: input.status }),
                ...(input.unset_status !== undefined && { unset_status: input.unset_status })
            },
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'List not found or update failed',
                list_id: input.list_id
            });
        }

        const providerList = ProviderListSchema.parse(response.data);

        return {
            id: providerList.id,
            name: providerList.name,
            ...(providerList.content !== undefined && { content: providerList.content }),
            ...(providerList.orderindex !== undefined && { orderindex: providerList.orderindex }),
            ...(providerList.status != null && { status: providerList.status }),
            ...(providerList.priority != null && { priority: providerList.priority }),
            ...(providerList.assignee != null && { assignee: providerList.assignee }),
            ...(providerList.due_date != null && { due_date: providerList.due_date }),
            ...(providerList.start_date != null && { start_date: providerList.start_date }),
            ...(providerList.folder != null && {
                folder: {
                    id: providerList.folder.id,
                    name: providerList.folder.name,
                    ...(providerList.folder.hidden !== undefined && { hidden: providerList.folder.hidden }),
                    ...(providerList.folder.access !== undefined && { access: providerList.folder.access })
                }
            }),
            ...(providerList.space !== undefined && { space: providerList.space }),
            ...(providerList.archived !== undefined && { archived: providerList.archived }),
            ...(providerList.override_statuses !== undefined && { override_statuses: providerList.override_statuses }),
            ...(providerList.permission_level !== undefined && { permission_level: providerList.permission_level })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
