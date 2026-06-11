import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('The ID of the list to archive. Example: "6a26f315d65f93eeac0b1b11"')
});

const ProviderListSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    closed: z.boolean().optional(),
    idBoard: z.string().optional(),
    pos: z.number().optional()
});

const OutputSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    closed: z.boolean().optional(),
    boardId: z.string().optional(),
    pos: z.number().optional()
});

const action = createAction({
    description: 'Archive a Trello list. Trello does not support permanent list deletion; lists are archived by setting closed=true.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/delete-list',
        group: 'Lists'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['read', 'write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.put({
            // https://developer.atlassian.com/cloud/trello/rest/api-group-lists/#api-lists-id-closed-put
            endpoint: `/1/lists/${encodeURIComponent(input.id)}/closed`,
            data: {
                value: true
            },
            retries: 3
        });

        const providerList = ProviderListSchema.parse(response.data);

        return {
            id: providerList.id,
            ...(providerList.name !== undefined && { name: providerList.name }),
            ...(providerList.closed !== undefined && { closed: providerList.closed }),
            ...(providerList.idBoard !== undefined && { boardId: providerList.idBoard }),
            ...(providerList.pos !== undefined && { pos: providerList.pos })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
