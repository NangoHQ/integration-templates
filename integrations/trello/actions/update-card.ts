import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('Card ID. Example: "6a26f2fdbc520ab9f45a5214"'),
    name: z.string().optional().describe('New name for the card.'),
    desc: z.string().nullable().optional().describe('New description for the card. Pass null to clear.'),
    closed: z.boolean().optional().describe('Whether the card is closed (archived).'),
    due: z.string().nullable().optional().describe('Due date in ISO 8601 format. Pass null to clear.'),
    dueComplete: z.boolean().optional().describe('Whether the due date is marked complete.'),
    idList: z.string().optional().describe('ID of the list to move the card to.'),
    idBoard: z.string().optional().describe('ID of the board to move the card to.'),
    idLabels: z.array(z.string()).optional().describe('Label IDs to set on the card.'),
    idMembers: z.array(z.string()).optional().describe('Member IDs to set on the card.')
});

const ProviderLabelSchema = z.object({
    id: z.string(),
    idBoard: z.string(),
    name: z.string().nullable(),
    color: z.string().nullable()
});

const ProviderCardSchema = z.object({
    id: z.string(),
    name: z.string(),
    desc: z.string().nullable(),
    closed: z.boolean(),
    due: z.string().nullable(),
    dueComplete: z.boolean().nullable(),
    idList: z.string(),
    idBoard: z.string(),
    idLabels: z.array(z.string()).optional(),
    idMembers: z.array(z.string()).optional(),
    labels: z.array(ProviderLabelSchema).optional(),
    pos: z.number(),
    dateLastActivity: z.string().optional(),
    shortLink: z.string().optional(),
    shortUrl: z.string().optional(),
    url: z.string().optional()
});

const OutputSchema = z.object({
    id: z.string(),
    name: z.string(),
    desc: z.string().optional(),
    closed: z.boolean(),
    due: z.string().optional(),
    dueComplete: z.boolean().optional(),
    idList: z.string(),
    idBoard: z.string(),
    idLabels: z.array(z.string()).optional(),
    idMembers: z.array(z.string()).optional(),
    labels: z
        .array(
            z.object({
                id: z.string(),
                idBoard: z.string(),
                name: z.string().optional(),
                color: z.string().optional()
            })
        )
        .optional(),
    pos: z.number(),
    dateLastActivity: z.string().optional(),
    shortLink: z.string().optional(),
    shortUrl: z.string().optional(),
    url: z.string().optional()
});

const action = createAction({
    description: 'Update a Trello card.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/update-card',
        group: 'Cards'
    },
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.put({
            // https://developer.atlassian.com/cloud/trello/rest/api-group-cards/#api-cards-id-put
            endpoint: `/1/cards/${encodeURIComponent(input.id)}`,
            data: {
                ...(input.name !== undefined && { name: input.name }),
                ...(input.desc !== undefined && { desc: input.desc }),
                ...(input.closed !== undefined && { closed: input.closed }),
                ...(input.due !== undefined && { due: input.due }),
                ...(input.dueComplete !== undefined && { dueComplete: input.dueComplete }),
                ...(input.idList !== undefined && { idList: input.idList }),
                ...(input.idBoard !== undefined && { idBoard: input.idBoard }),
                ...(input.idLabels !== undefined && { idLabels: input.idLabels.join(',') }),
                ...(input.idMembers !== undefined && { idMembers: input.idMembers.join(',') })
            },
            retries: 1
        });

        const providerCard = ProviderCardSchema.parse(response.data);

        return {
            id: providerCard.id,
            name: providerCard.name,
            ...(providerCard.desc != null && { desc: providerCard.desc }),
            closed: providerCard.closed,
            ...(providerCard.due != null && { due: providerCard.due }),
            ...(providerCard.dueComplete != null && { dueComplete: providerCard.dueComplete }),
            idList: providerCard.idList,
            idBoard: providerCard.idBoard,
            ...(providerCard.idLabels !== undefined && { idLabels: providerCard.idLabels }),
            ...(providerCard.idMembers !== undefined && { idMembers: providerCard.idMembers }),
            ...(providerCard.labels !== undefined && {
                labels: providerCard.labels.map((label) => ({
                    id: label.id,
                    idBoard: label.idBoard,
                    ...(label.name != null && { name: label.name }),
                    ...(label.color != null && { color: label.color })
                }))
            }),
            pos: providerCard.pos,
            ...(providerCard.dateLastActivity !== undefined && { dateLastActivity: providerCard.dateLastActivity }),
            ...(providerCard.shortLink !== undefined && { shortLink: providerCard.shortLink }),
            ...(providerCard.shortUrl !== undefined && { shortUrl: providerCard.shortUrl }),
            ...(providerCard.url !== undefined && { url: providerCard.url })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
