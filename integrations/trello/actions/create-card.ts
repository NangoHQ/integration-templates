import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    idList: z.string().describe('The ID of the list the card should be created in. Example: "5f3c8c1c3f8f7e8b7c8b9c0a"'),
    name: z.string().describe('The name of the card. Example: "My new card"'),
    desc: z.string().optional().describe('The description of the card. Example: "This is a description"'),
    due: z.string().optional().describe('The due date of the card in ISO 8601 format. Example: "2024-01-01T00:00:00.000Z"'),
    idLabels: z.array(z.string()).optional().describe('Array of label IDs to attach to the card. Example: ["5f3c8c1c3f8f7e8b7c8b9c0a"]'),
    idMembers: z.array(z.string()).optional().describe('Array of member IDs to attach to the card. Example: ["5f3c8c1c3f8f7e8b7c8b9c0a"]')
});

const ProviderCardSchema = z.object({
    id: z.string(),
    name: z.string(),
    desc: z.string().optional(),
    due: z.string().nullable().optional(),
    idList: z.string(),
    idBoard: z.string().optional(),
    idLabels: z.array(z.string()).optional(),
    idMembers: z.array(z.string()).optional(),
    url: z.string().optional(),
    shortUrl: z.string().optional()
});

const OutputSchema = z.object({
    id: z.string(),
    name: z.string(),
    desc: z.string().optional(),
    due: z.string().optional(),
    idList: z.string(),
    idBoard: z.string().optional(),
    idLabels: z.array(z.string()).optional(),
    idMembers: z.array(z.string()).optional(),
    url: z.string().optional(),
    shortUrl: z.string().optional()
});

const action = createAction({
    description: 'Create a card in Trello.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://developer.atlassian.com/cloud/trello/rest/api-group-cards/#api-cards-post
            endpoint: '/1/cards',
            data: {
                idList: input.idList,
                name: input.name,
                ...(input.desc !== undefined && { desc: input.desc }),
                ...(input.due !== undefined && { due: input.due }),
                ...(input.idLabels !== undefined && input.idLabels.length > 0 && { idLabels: input.idLabels.join(',') }),
                ...(input.idMembers !== undefined && input.idMembers.length > 0 && { idMembers: input.idMembers.join(',') })
            },
            retries: 3
        });

        const providerCard = ProviderCardSchema.parse(response.data);

        return {
            id: providerCard.id,
            name: providerCard.name,
            ...(providerCard.desc !== undefined && { desc: providerCard.desc }),
            ...(providerCard.due != null && { due: providerCard.due }),
            idList: providerCard.idList,
            ...(providerCard.idBoard !== undefined && { idBoard: providerCard.idBoard }),
            ...(providerCard.idLabels !== undefined && { idLabels: providerCard.idLabels }),
            ...(providerCard.idMembers !== undefined && { idMembers: providerCard.idMembers }),
            ...(providerCard.url !== undefined && { url: providerCard.url }),
            ...(providerCard.shortUrl !== undefined && { shortUrl: providerCard.shortUrl })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
