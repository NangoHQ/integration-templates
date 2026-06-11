import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('The ID of the list to update. Example: "5abbe4b7ee6c1d1ed5210aaa"'),
    name: z.string().optional().describe('The new name for the list.'),
    closed: z.boolean().optional().describe('Whether the list should be closed (archived).'),
    pos: z.union([z.number(), z.string()]).optional().describe('The position of the list. Can be a number or "top" / "bottom".'),
    subscribed: z.boolean().optional().describe('Whether the authenticated user is subscribed to the list.')
});

const ProviderListSchema = z.object({
    id: z.string(),
    name: z.string(),
    closed: z.boolean(),
    idBoard: z.string(),
    pos: z.number(),
    subscribed: z.boolean().optional()
});

const OutputSchema = z.object({
    id: z.string(),
    name: z.string(),
    closed: z.boolean(),
    idBoard: z.string(),
    pos: z.number(),
    subscribed: z.boolean().optional()
});

const action = createAction({
    description: 'Update a Trello list.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/update-list',
        group: 'Lists'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['read', 'write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.put({
            // https://developer.atlassian.com/cloud/trello/rest/api-group-lists/#api-lists-id-put
            endpoint: `/1/lists/${encodeURIComponent(input.id)}`,
            data: {
                ...(input.name !== undefined && { name: input.name }),
                ...(input.closed !== undefined && { closed: input.closed }),
                ...(input.pos !== undefined && { pos: input.pos }),
                ...(input.subscribed !== undefined && { subscribed: input.subscribed })
            },
            retries: 3
        });

        const providerList = ProviderListSchema.parse(response.data);

        return {
            id: providerList.id,
            name: providerList.name,
            closed: providerList.closed,
            idBoard: providerList.idBoard,
            pos: providerList.pos,
            ...(providerList.subscribed !== undefined && { subscribed: providerList.subscribed })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
