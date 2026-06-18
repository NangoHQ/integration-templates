import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    listId: z.string().describe('The ID of the list to retrieve. Example: "901523451693"')
});

const ProviderListSchema = z.object({
    id: z.string(),
    name: z.string(),
    orderindex: z.number(),
    task_count: z.number().optional(),
    folder: z
        .object({
            id: z.string(),
            name: z.string(),
            hidden: z.boolean().optional(),
            access: z.boolean().optional()
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
        .optional(),
    permission_level: z.string().optional()
});

const action = createAction({
    description: 'Retrieve a single list from ClickUp.',
    version: '1.0.1',
    input: InputSchema,
    output: ProviderListSchema,

    exec: async (nango, input): Promise<z.infer<typeof ProviderListSchema>> => {
        const response = await nango.get({
            // https://developer.clickup.com/reference/getlist
            endpoint: `/api/v2/list/${encodeURIComponent(input.listId)}`,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'List not found',
                listId: input.listId
            });
        }

        const providerList = ProviderListSchema.parse(response.data);

        return {
            id: providerList.id,
            name: providerList.name,
            orderindex: providerList.orderindex,
            ...(providerList.task_count !== undefined && { task_count: providerList.task_count }),
            ...(providerList.folder !== undefined && { folder: providerList.folder }),
            space: providerList.space,
            ...(providerList.statuses !== undefined && { statuses: providerList.statuses }),
            ...(providerList.permission_level !== undefined && { permission_level: providerList.permission_level })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
