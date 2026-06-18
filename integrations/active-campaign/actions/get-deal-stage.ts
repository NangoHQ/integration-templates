import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const InputSchema = z.object({
    id: z.union([z.string(), z.number()]).describe('Deal stage ID. Example: 1')
});

const ProviderDealStageSchema = z.object({
    cardRegion1: z.string().nullable().optional(),
    cardRegion2: z.string().nullable().optional(),
    cardRegion3: z.string().nullable().optional(),
    cardRegion4: z.string().nullable().optional(),
    cardRegion5: z.string().nullable().optional(),
    cdate: z.string().nullable().optional(),
    color: z.string().nullable().optional(),
    dealOrder: z.string().nullable().optional(),
    group: z.string().nullable().optional(),
    id: z.string(),
    links: z
        .object({
            group: z.string().nullable().optional()
        })
        .nullable()
        .optional(),
    order: z.union([z.string(), z.number()]).nullable().optional(),
    title: z.string().nullable().optional(),
    udate: z.string().nullable().optional(),
    width: z.union([z.string(), z.number()]).nullable().optional()
});

const OutputSchema = z.object({
    cardRegion1: z.string().optional(),
    cardRegion2: z.string().optional(),
    cardRegion3: z.string().optional(),
    cardRegion4: z.string().optional(),
    cardRegion5: z.string().optional(),
    cdate: z.string().optional(),
    color: z.string().optional(),
    dealOrder: z.string().optional(),
    group: z.string().optional(),
    id: z.string(),
    links: z
        .object({
            group: z.string().optional()
        })
        .optional(),
    order: z.union([z.string(), z.number()]).optional(),
    title: z.string().optional(),
    udate: z.string().optional(),
    width: z.union([z.string(), z.number()]).optional()
});

const action = createAction({
    description: 'Retrieve a single deal stage from ActiveCampaign.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://developers.activecampaign.com/reference/retrieve-a-deal-stage
            endpoint: `/3/dealStages/${encodeURIComponent(String(input.id))}`,
            retries: 3
        };

        const response = await nango.get(config);

        if (!response.data || !response.data.dealStage) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Deal stage not found',
                id: String(input.id)
            });
        }

        const providerData = ProviderDealStageSchema.parse(response.data.dealStage);

        return {
            ...(providerData.cardRegion1 != null && { cardRegion1: providerData.cardRegion1 }),
            ...(providerData.cardRegion2 != null && { cardRegion2: providerData.cardRegion2 }),
            ...(providerData.cardRegion3 != null && { cardRegion3: providerData.cardRegion3 }),
            ...(providerData.cardRegion4 != null && { cardRegion4: providerData.cardRegion4 }),
            ...(providerData.cardRegion5 != null && { cardRegion5: providerData.cardRegion5 }),
            ...(providerData.cdate != null && { cdate: providerData.cdate }),
            ...(providerData.color != null && { color: providerData.color }),
            ...(providerData.dealOrder != null && { dealOrder: providerData.dealOrder }),
            ...(providerData.group != null && { group: providerData.group }),
            id: providerData.id,
            ...(providerData.links != null && {
                links: {
                    ...(providerData.links.group != null && { group: providerData.links.group })
                }
            }),
            ...(providerData.order != null && { order: providerData.order }),
            ...(providerData.title != null && { title: providerData.title }),
            ...(providerData.udate != null && { udate: providerData.udate }),
            ...(providerData.width != null && { width: providerData.width })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
