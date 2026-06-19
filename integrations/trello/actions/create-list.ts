import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    name: z.string().describe('The name of the list. Example: "To Do"'),
    idBoard: z.string().describe('The ID of the board to create the list on. Example: "6a26ebb3cd5f60a53a585978"'),
    pos: z.union([z.string(), z.number()]).optional().describe('The position of the list. Example: "top", "bottom", or a number.')
});

const ProviderListSchema = z.object({
    id: z.string(),
    name: z.string(),
    idBoard: z.string(),
    pos: z.number(),
    closed: z.boolean().optional(),
    subscribed: z.boolean().optional()
});

const OutputSchema = z.object({
    id: z.string(),
    name: z.string(),
    idBoard: z.string(),
    pos: z.number(),
    closed: z.boolean().optional(),
    subscribed: z.boolean().optional()
});

const action = createAction({
    description: 'Create a list in Trello.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['read', 'write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://developer.atlassian.com/cloud/trello/rest/api-group-lists/#api-lists-post
            endpoint: '/1/lists',
            data: {
                name: input.name,
                idBoard: input.idBoard,
                ...(input.pos !== undefined && { pos: input.pos })
            },
            retries: 3
        });

        const providerList = ProviderListSchema.parse(response.data);

        return {
            id: providerList.id,
            name: providerList.name,
            idBoard: providerList.idBoard,
            pos: providerList.pos,
            ...(providerList.closed !== undefined && { closed: providerList.closed }),
            ...(providerList.subscribed !== undefined && { subscribed: providerList.subscribed })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
