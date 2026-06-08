import { z } from 'zod';
import { createAction, ProxyConfiguration } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('The ID of the list to retrieve. Example: "5abbe4b7ddc1b351ef961414"')
});

const TrelloListSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    closed: z.boolean().optional(),
    pos: z.number().optional(),
    softLimit: z.string().optional(),
    idBoard: z.string().optional(),
    subscribed: z.boolean().optional(),
    limits: z.unknown().optional()
});

const OutputSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    closed: z.boolean().optional(),
    pos: z.number().optional(),
    softLimit: z.string().optional(),
    idBoard: z.string().optional(),
    subscribed: z.boolean().optional(),
    limits: z.unknown().optional()
});

const action = createAction({
    description: 'Retrieve a single list from Trello.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/get-list',
        group: 'Lists'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://developer.atlassian.com/cloud/trello/rest/api-group-lists/#api-lists-id-get
            endpoint: `/1/lists/${encodeURIComponent(input.id)}`,
            retries: 3
        };

        const response = await nango.get(config);

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'List not found',
                id: input.id
            });
        }

        const providerList = TrelloListSchema.parse(response.data);

        return {
            id: providerList.id,
            ...(providerList.name !== undefined && { name: providerList.name }),
            ...(providerList.closed !== undefined && { closed: providerList.closed }),
            ...(providerList.pos !== undefined && { pos: providerList.pos }),
            ...(providerList.softLimit !== undefined && { softLimit: providerList.softLimit }),
            ...(providerList.idBoard !== undefined && { idBoard: providerList.idBoard }),
            ...(providerList.subscribed !== undefined && { subscribed: providerList.subscribed }),
            ...(providerList.limits !== undefined && { limits: providerList.limits })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
