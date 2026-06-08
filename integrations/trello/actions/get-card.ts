import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('The ID of the card to retrieve. Example: "5abbe4b7ddc1b351ef961414"')
});

const ProviderLabelSchema = z.object({
    id: z.string(),
    idBoard: z.string(),
    name: z.string(),
    color: z.string().nullable().optional()
});

const ProviderCoverSchema = z.object({
    color: z.string().nullable().optional(),
    idUploadedBackground: z.union([z.string(), z.boolean(), z.null()]).optional(),
    size: z.string().nullable().optional(),
    brightness: z.string().nullable().optional(),
    isTemplate: z.boolean().optional()
});

const ProviderCardSchema = z.object({
    id: z.string(),
    name: z.string(),
    desc: z.string().nullable().optional(),
    closed: z.boolean().optional(),
    dateLastActivity: z.string().nullable().optional(),
    due: z.string().nullable().optional(),
    dueComplete: z.boolean().optional(),
    idBoard: z.string(),
    idList: z.string(),
    idMembers: z.array(z.string()).optional(),
    idLabels: z.array(ProviderLabelSchema).optional(),
    idChecklists: z.array(z.string()).optional(),
    labels: z.array(z.string()).optional(),
    pos: z.number().optional(),
    shortLink: z.string().optional(),
    shortUrl: z.string().optional(),
    url: z.string().optional(),
    subscribed: z.boolean().optional(),
    cover: ProviderCoverSchema.nullable().optional()
});

const OutputSchema = z.object({
    id: z.string(),
    name: z.string(),
    desc: z.string().optional(),
    closed: z.boolean().optional(),
    dateLastActivity: z.string().optional(),
    due: z.string().optional(),
    dueComplete: z.boolean().optional(),
    idBoard: z.string(),
    idList: z.string(),
    idMembers: z.array(z.string()).optional(),
    idLabels: z.array(ProviderLabelSchema).optional(),
    idChecklists: z.array(z.string()).optional(),
    labels: z.array(z.string()).optional(),
    pos: z.number().optional(),
    shortLink: z.string().optional(),
    shortUrl: z.string().optional(),
    url: z.string().optional(),
    subscribed: z.boolean().optional(),
    cover: ProviderCoverSchema.optional()
});

const action = createAction({
    description: 'Retrieve a single card from Trello.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/get-card',
        group: 'Cards'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://developer.atlassian.com/cloud/trello/rest/api-group-cards/#api-cards-id-get
            endpoint: `/1/cards/${encodeURIComponent(input.id)}`,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Card not found',
                id: input.id
            });
        }

        const providerCard = ProviderCardSchema.parse(response.data);

        return {
            id: providerCard.id,
            name: providerCard.name,
            ...(providerCard.desc != null && { desc: providerCard.desc }),
            ...(providerCard.closed !== undefined && { closed: providerCard.closed }),
            ...(providerCard.dateLastActivity != null && { dateLastActivity: providerCard.dateLastActivity }),
            ...(providerCard.due != null && { due: providerCard.due }),
            ...(providerCard.dueComplete !== undefined && { dueComplete: providerCard.dueComplete }),
            idBoard: providerCard.idBoard,
            idList: providerCard.idList,
            ...(providerCard.idMembers !== undefined && { idMembers: providerCard.idMembers }),
            ...(providerCard.idLabels !== undefined && { idLabels: providerCard.idLabels }),
            ...(providerCard.idChecklists !== undefined && { idChecklists: providerCard.idChecklists }),
            ...(providerCard.labels !== undefined && { labels: providerCard.labels }),
            ...(providerCard.pos !== undefined && { pos: providerCard.pos }),
            ...(providerCard.shortLink !== undefined && { shortLink: providerCard.shortLink }),
            ...(providerCard.shortUrl !== undefined && { shortUrl: providerCard.shortUrl }),
            ...(providerCard.url !== undefined && { url: providerCard.url }),
            ...(providerCard.subscribed !== undefined && { subscribed: providerCard.subscribed }),
            ...(providerCard.cover != null && { cover: providerCard.cover })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
