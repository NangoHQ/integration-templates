import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    title: z.string().describe('Deal stage title. Example: "Initial Contact"'),
    group: z.string().describe('Deal stage pipeline id. Example: "1"'),
    order: z.number().optional().describe('Order of the deal stage within the pipeline. Example: 1'),
    dealOrder: z.string().optional().describe('Option and direction to sort deals in the stage. Example: "next-action DESC"'),
    cardRegion1: z.string().optional().describe('What to show in upper-left corner of Deal Cards. Example: "title"'),
    cardRegion2: z.string().optional().describe('What to show in upper-right corner of Deal Cards. Example: "next-action"'),
    cardRegion3: z.string().optional().describe('Whether to show the avatar in Deal Cards. Example: "show-avatar"'),
    cardRegion4: z.string().optional().describe('What to show next to the avatar in Deal Cards. Example: "contact-fullname-orgname"'),
    cardRegion5: z.string().optional().describe('What to show in lower-right corner of Deal Cards. Example: "value"'),
    color: z.string().optional().describe('Deal Stage color as 6-character HEX without hashtag. Example: "32B0FC"'),
    width: z.number().optional().describe('Deal stage width in pixels. Example: 280'),
    reorder: z
        .union([z.literal(0), z.literal(1)])
        .optional()
        .describe('Whether to reorder stages after creation. Can be 0 or 1.')
});

const ProviderDealStageSchema = z.object({
    id: z.string(),
    title: z.string(),
    group: z.string(),
    order: z.union([z.string(), z.number()]),
    color: z.string().optional(),
    width: z.union([z.string(), z.number()]).optional(),
    cardRegion1: z.string().optional(),
    cardRegion2: z.string().optional(),
    cardRegion3: z.string().optional(),
    cardRegion4: z.string().optional(),
    cardRegion5: z.string().optional(),
    dealOrder: z.string().optional(),
    cdate: z.string().optional(),
    udate: z.string().optional(),
    links: z
        .object({
            group: z.string().optional()
        })
        .optional()
});

const OutputSchema = z.object({
    id: z.string(),
    title: z.string(),
    group: z.string(),
    order: z.union([z.string(), z.number()]),
    color: z.string().optional(),
    width: z.union([z.string(), z.number()]).optional(),
    cardRegion1: z.string().optional(),
    cardRegion2: z.string().optional(),
    cardRegion3: z.string().optional(),
    cardRegion4: z.string().optional(),
    cardRegion5: z.string().optional(),
    dealOrder: z.string().optional(),
    cdate: z.string().optional(),
    udate: z.string().optional()
});

const action = createAction({
    description: 'Create a deal stage in ActiveCampaign.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://developers.activecampaign.com/reference/create-a-deal-stage
            endpoint: '/3/dealStages',
            params: {
                ...(input.reorder !== undefined && { reorder: String(input.reorder) })
            },
            data: {
                dealStage: {
                    title: input.title,
                    group: input.group,
                    ...(input.order !== undefined && { order: input.order }),
                    ...(input.dealOrder !== undefined && { dealOrder: input.dealOrder }),
                    ...(input.cardRegion1 !== undefined && { cardRegion1: input.cardRegion1 }),
                    ...(input.cardRegion2 !== undefined && { cardRegion2: input.cardRegion2 }),
                    ...(input.cardRegion3 !== undefined && { cardRegion3: input.cardRegion3 }),
                    ...(input.cardRegion4 !== undefined && { cardRegion4: input.cardRegion4 }),
                    ...(input.cardRegion5 !== undefined && { cardRegion5: input.cardRegion5 }),
                    ...(input.color !== undefined && { color: input.color }),
                    ...(input.width !== undefined && { width: input.width })
                }
            },
            retries: 10
        });

        const raw = response.data;
        if (!raw || typeof raw !== 'object' || !('dealStage' in raw)) {
            throw new nango.ActionError({
                type: 'unexpected_response',
                message: 'Provider response did not contain dealStage.'
            });
        }

        const providerDealStage = ProviderDealStageSchema.parse(raw.dealStage);

        return {
            id: providerDealStage.id,
            title: providerDealStage.title,
            group: providerDealStage.group,
            order: providerDealStage.order,
            ...(providerDealStage.color !== undefined && { color: providerDealStage.color }),
            ...(providerDealStage.width !== undefined && { width: providerDealStage.width }),
            ...(providerDealStage.cardRegion1 !== undefined && { cardRegion1: providerDealStage.cardRegion1 }),
            ...(providerDealStage.cardRegion2 !== undefined && { cardRegion2: providerDealStage.cardRegion2 }),
            ...(providerDealStage.cardRegion3 !== undefined && { cardRegion3: providerDealStage.cardRegion3 }),
            ...(providerDealStage.cardRegion4 !== undefined && { cardRegion4: providerDealStage.cardRegion4 }),
            ...(providerDealStage.cardRegion5 !== undefined && { cardRegion5: providerDealStage.cardRegion5 }),
            ...(providerDealStage.dealOrder !== undefined && { dealOrder: providerDealStage.dealOrder }),
            ...(providerDealStage.cdate !== undefined && { cdate: providerDealStage.cdate }),
            ...(providerDealStage.udate !== undefined && { udate: providerDealStage.udate })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
