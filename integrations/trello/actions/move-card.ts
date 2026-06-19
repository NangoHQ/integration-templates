import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('The ID of the card to move. Example: "5f3c2b1a4b3d2a1c8e4f5g6h"'),
    idList: z.string().optional().describe('The ID of the list to move the card to. Example: "5f3c2b1a4b3d2a1c8e4f5g6i"'),
    idBoard: z.string().optional().describe('The ID of the board to move the card to. Example: "5f3c2b1a4b3d2a1c8e4f5g6j"')
});

const ProviderCardSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    idList: z.string().optional(),
    idBoard: z.string().optional(),
    desc: z.string().optional(),
    url: z.string().optional(),
    pos: z.number().optional()
});

const OutputSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    idList: z.string().optional(),
    idBoard: z.string().optional()
});

const action = createAction({
    description: 'Move a Trello card to another list or board.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const data: Record<string, string> = {};
        if (input.idList !== undefined) {
            data['idList'] = input.idList;
        }
        if (input.idBoard !== undefined) {
            data['idBoard'] = input.idBoard;
        }

        if (Object.keys(data).length === 0) {
            throw new nango.ActionError({
                type: 'invalid_input',
                message: 'At least one of idList or idBoard must be provided.'
            });
        }

        const response = await nango.put({
            // https://developer.atlassian.com/cloud/trello/rest/api-group-cards/#api-cards-id-put
            endpoint: `/1/cards/${encodeURIComponent(input.id)}`,
            data,
            retries: 3
        });

        const providerCard = ProviderCardSchema.parse(response.data);

        return {
            id: providerCard.id,
            ...(providerCard.name !== undefined && { name: providerCard.name }),
            ...(providerCard.idList !== undefined && { idList: providerCard.idList }),
            ...(providerCard.idBoard !== undefined && { idBoard: providerCard.idBoard })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
