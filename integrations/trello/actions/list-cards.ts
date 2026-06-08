import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    boardId: z.string().describe('Board ID. Example: "6a26ebb3cd5f60a53a585978"'),
    filter: z.enum(['all', 'open', 'closed']).optional().describe('Filter for cards. Example: "all"'),
    fields: z.string().optional().describe('Comma-separated list of fields to return. Example: "name,id"')
});

const ProviderCardSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    desc: z.string().optional(),
    closed: z.boolean().optional(),
    idBoard: z.string().optional(),
    idList: z.string().optional(),
    idMembers: z.array(z.string()).optional(),
    idLabels: z.array(z.string()).optional(),
    idChecklists: z.array(z.string()).optional(),
    pos: z.number().optional(),
    due: z.string().nullable().optional(),
    dueComplete: z.boolean().optional(),
    dateLastActivity: z.string().optional(),
    shortUrl: z.string().optional(),
    url: z.string().optional(),
    labels: z
        .array(
            z.object({
                id: z.string().optional(),
                name: z.string().optional(),
                color: z.string().nullable().optional()
            })
        )
        .optional()
});

const OutputSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    desc: z.string().optional(),
    closed: z.boolean().optional(),
    idBoard: z.string().optional(),
    idList: z.string().optional(),
    idMembers: z.array(z.string()).optional(),
    idLabels: z.array(z.string()).optional(),
    idChecklists: z.array(z.string()).optional(),
    pos: z.number().optional(),
    due: z.string().optional(),
    dueComplete: z.boolean().optional(),
    dateLastActivity: z.string().optional(),
    shortUrl: z.string().optional(),
    url: z.string().optional(),
    labels: z
        .array(
            z.object({
                id: z.string().optional(),
                name: z.string().optional(),
                color: z.string().nullable().optional()
            })
        )
        .optional()
});

const ListOutputSchema = z.object({
    cards: z.array(OutputSchema)
});

const action = createAction({
    description: 'List cards on a Trello board',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/list-cards',
        group: 'Cards'
    },
    input: InputSchema,
    output: ListOutputSchema,
    scopes: ['read'],

    exec: async (nango, input): Promise<z.infer<typeof ListOutputSchema>> => {
        const response = await nango.get({
            // https://developer.atlassian.com/cloud/trello/rest/api-group-boards/#api-boards-id-cards-get
            endpoint: `/1/boards/${encodeURIComponent(input.boardId)}/cards`,
            params: {
                ...(input.filter !== undefined && { filter: input.filter }),
                ...(input.fields !== undefined && { fields: input.fields })
            },
            retries: 3
        });

        const cards = z.array(z.unknown()).parse(response.data);

        return {
            cards: cards.map((card) => {
                const parsed = ProviderCardSchema.parse(card);
                return {
                    id: parsed.id,
                    ...(parsed.name !== undefined && { name: parsed.name }),
                    ...(parsed.desc !== undefined && { desc: parsed.desc }),
                    ...(parsed.closed !== undefined && { closed: parsed.closed }),
                    ...(parsed.idBoard !== undefined && { idBoard: parsed.idBoard }),
                    ...(parsed.idList !== undefined && { idList: parsed.idList }),
                    ...(parsed.idMembers !== undefined && { idMembers: parsed.idMembers }),
                    ...(parsed.idLabels !== undefined && { idLabels: parsed.idLabels }),
                    ...(parsed.idChecklists !== undefined && { idChecklists: parsed.idChecklists }),
                    ...(parsed.pos !== undefined && { pos: parsed.pos }),
                    ...(parsed.due != null && { due: parsed.due }),
                    ...(parsed.dueComplete !== undefined && { dueComplete: parsed.dueComplete }),
                    ...(parsed.dateLastActivity !== undefined && { dateLastActivity: parsed.dateLastActivity }),
                    ...(parsed.shortUrl !== undefined && { shortUrl: parsed.shortUrl }),
                    ...(parsed.url !== undefined && { url: parsed.url }),
                    ...(parsed.labels !== undefined && { labels: parsed.labels })
                };
            })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
