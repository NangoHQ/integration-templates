import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    boardId: z.string().describe('The ID of the board to list lists from. Example: "6a26ebb3cd5f60a53a585978"'),
    filter: z.enum(['all', 'open', 'closed']).optional().describe('Filter for lists. One of: all, open, closed.')
});

const ListSchema = z.object({
    id: z.string(),
    name: z.string(),
    closed: z.boolean(),
    pos: z.number(),
    idBoard: z.string().optional(),
    subscribed: z.boolean().optional()
});

const OutputSchema = z.object({
    lists: z.array(ListSchema)
});

const action = createAction({
    description: 'List lists on a Trello board.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/list-lists',
        group: 'Boards'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://developer.atlassian.com/cloud/trello/rest/api-group-boards/#api-boards-id-lists-get
            endpoint: `/1/boards/${encodeURIComponent(input.boardId)}/lists`,
            params: {
                ...(input.filter !== undefined && { filter: input.filter })
            },
            retries: 3
        });

        const providerLists = z.array(z.unknown()).parse(response.data);

        const lists = providerLists.map((item: unknown) => {
            const parsed = ListSchema.parse(item);

            return {
                id: parsed.id,
                name: parsed.name,
                closed: parsed.closed,
                pos: parsed.pos,
                ...(parsed.idBoard !== undefined && { idBoard: parsed.idBoard }),
                ...(parsed.subscribed !== undefined && { subscribed: parsed.subscribed })
            };
        });

        return {
            lists
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
