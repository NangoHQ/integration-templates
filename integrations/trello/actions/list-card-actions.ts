import { z } from 'zod';
import { createAction } from 'nango';

const MemberCreatorSchema = z
    .object({
        id: z.string(),
        fullName: z.string().optional(),
        username: z.string().optional()
    })
    .passthrough();

const ProviderActionSchema = z
    .object({
        id: z.string(),
        idMemberCreator: z.string(),
        type: z.string(),
        date: z.string(),
        data: z.record(z.string(), z.unknown()),
        memberCreator: MemberCreatorSchema.optional()
    })
    .passthrough();

const OutputActionSchema = z.object({
    id: z.string(),
    idMemberCreator: z.string(),
    type: z.string(),
    date: z.string(),
    data: z.record(z.string(), z.unknown()),
    memberCreator: z
        .object({
            id: z.string(),
            fullName: z.string().optional(),
            username: z.string().optional()
        })
        .optional()
});

const InputSchema = z.object({
    cardId: z.string().describe('Trello card ID. Example: "6a26f2fdbc520ab9f45a5214"'),
    filter: z.string().optional().describe('Comma-separated action types to filter. Example: "commentCard,updateCard"'),
    cursor: z.string().optional().describe('Pagination cursor (page number). Omit for the first page.')
});

const OutputSchema = z.object({
    actions: z.array(OutputActionSchema),
    nextCursor: z.string().optional()
});

const action = createAction({
    description: 'List activity actions for a Trello card (includes comments, moves, updates)',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/list-card-actions',
        group: 'Cards'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const page = input.cursor ? parseInt(input.cursor, 10) : 0;
        const limit = 50;

        const response = await nango.get({
            // https://developer.atlassian.com/cloud/trello/rest/api-group-cards/#api-cards-id-actions-get
            endpoint: `/1/cards/${encodeURIComponent(input.cardId)}/actions`,
            params: {
                ...(input.filter && { filter: input.filter }),
                page: String(page),
                limit: String(limit)
            },
            retries: 3
        });

        const providerActions = z.array(ProviderActionSchema).parse(response.data);

        const actions = providerActions.map((item) => ({
            id: item.id,
            idMemberCreator: item.idMemberCreator,
            type: item.type,
            date: item.date,
            data: item.data,
            ...(item.memberCreator && {
                memberCreator: {
                    id: item.memberCreator.id,
                    ...(item.memberCreator.fullName !== undefined && { fullName: item.memberCreator.fullName }),
                    ...(item.memberCreator.username !== undefined && { username: item.memberCreator.username })
                }
            })
        }));

        const nextPage = page + 1;
        const nextCursor = providerActions.length === limit && nextPage * limit < 1000 ? String(nextPage) : undefined;

        return {
            actions,
            ...(nextCursor !== undefined && { nextCursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
