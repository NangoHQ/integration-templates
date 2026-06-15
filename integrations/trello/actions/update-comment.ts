import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    cardId: z.string().describe('The ID of the card containing the comment. Example: "6a26f2fdbc520ab9f45a5214"'),
    actionId: z.string().describe('The ID of the commentCard action to update. Example: "6a26f3375b582134880a0182"'),
    text: z.string().describe('The new text for the comment.')
});

const ProviderCommentSchema = z.object({
    id: z.string(),
    idMemberCreator: z.string().optional(),
    data: z
        .object({
            text: z.string().optional(),
            card: z
                .object({
                    id: z.string().optional(),
                    name: z.string().optional()
                })
                .optional(),
            board: z
                .object({
                    id: z.string().optional(),
                    name: z.string().optional()
                })
                .optional()
        })
        .optional(),
    type: z.string().optional(),
    date: z.string().optional()
});

const OutputSchema = z.object({
    id: z.string(),
    idMemberCreator: z.string().optional(),
    text: z.string().optional(),
    cardId: z.string().optional(),
    cardName: z.string().optional(),
    boardId: z.string().optional(),
    boardName: z.string().optional(),
    type: z.string().optional(),
    date: z.string().optional()
});

const action = createAction({
    description: 'Update an existing comment on a Trello card.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/update-comment',
        group: 'Actions'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['read', 'write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.put({
            // https://developer.atlassian.com/cloud/trello/rest/api-group-actions/#api-actions-id-action-put
            endpoint: `/1/cards/${encodeURIComponent(input.cardId)}/actions/${encodeURIComponent(input.actionId)}/comments`,
            data: {
                text: input.text
            },
            retries: 3
        });

        const providerComment = ProviderCommentSchema.parse(response.data);

        return {
            id: providerComment.id,
            ...(providerComment.idMemberCreator !== undefined && { idMemberCreator: providerComment.idMemberCreator }),
            ...(providerComment.data?.text !== undefined && { text: providerComment.data.text }),
            ...(providerComment.data?.card?.id !== undefined && { cardId: providerComment.data.card.id }),
            ...(providerComment.data?.card?.name !== undefined && { cardName: providerComment.data.card.name }),
            ...(providerComment.data?.board?.id !== undefined && { boardId: providerComment.data.board.id }),
            ...(providerComment.data?.board?.name !== undefined && { boardName: providerComment.data.board.name }),
            ...(providerComment.type !== undefined && { type: providerComment.type }),
            ...(providerComment.date !== undefined && { date: providerComment.date })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
