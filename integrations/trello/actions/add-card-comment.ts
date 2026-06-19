import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    cardId: z.string().describe('Card ID. Example: "6a26f2fdbc520ab9f45a5214"'),
    text: z.string().describe('Comment text. Example: "This is a comment."')
});

const ProviderActionSchema = z.object({
    id: z.string(),
    idMemberCreator: z.string(),
    type: z.string(),
    date: z.string(),
    data: z.object({
        card: z.object({
            id: z.string()
        }),
        text: z.string()
    })
});

const OutputSchema = z.object({
    id: z.string(),
    cardId: z.string(),
    memberId: z.string(),
    text: z.string(),
    date: z.string()
});

const action = createAction({
    description: 'Add a comment to a Trello card.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://developer.atlassian.com/cloud/trello/rest/api-group-actions/#api-cards-id-actions-comments-post
            endpoint: `/1/cards/${encodeURIComponent(input.cardId)}/actions/comments`,
            data: {
                text: input.text
            },
            retries: 3
        });

        const providerAction = ProviderActionSchema.parse(response.data);

        return {
            id: providerAction.id,
            cardId: providerAction.data.card.id,
            memberId: providerAction.idMemberCreator,
            text: providerAction.data.text,
            date: providerAction.date
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
