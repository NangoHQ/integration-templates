import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('Deal stage ID. Example: "1"'),
    title: z.string().optional().describe('Deal stage title.'),
    color: z.string().optional().describe('Hex color code for the stage. Example: "32B0FC"'),
    group: z.string().optional().describe('Pipeline (deal group) ID. Example: "1"'),
    order: z.number().optional().describe('Order of the stage within the pipeline.'),
    width: z.number().optional().describe('Width of the stage card in pixels.'),
    dealOrder: z.string().optional().describe('Sort order for deals in this stage. Example: "next-action DESC"'),
    cardRegion1: z.string().optional().describe('Content for card region 1.'),
    cardRegion2: z.string().optional().describe('Content for card region 2.'),
    cardRegion3: z.string().optional().describe('Avatar display setting. Example: "show-avatar" or "hide-avatar"'),
    cardRegion4: z.string().optional().describe('Content for card region 4.'),
    cardRegion5: z.string().optional().describe('Content for card region 5.'),
    reorder: z.number().optional().describe('Whether to reorder stages after update. Set to 1 to reorder.')
});

const ProviderDealStageSchema = z.object({
    id: z.string(),
    title: z.string().optional(),
    color: z.string().optional(),
    group: z.string().optional(),
    order: z.string().optional(),
    width: z.string().optional(),
    dealOrder: z.string().optional(),
    cardRegion1: z.string().optional(),
    cardRegion2: z.string().optional(),
    cardRegion3: z.string().optional(),
    cardRegion4: z.string().optional(),
    cardRegion5: z.string().optional(),
    cdate: z.string().nullable().optional(),
    udate: z.string().nullable().optional()
});

const OutputSchema = z.object({
    id: z.string(),
    title: z.string().optional(),
    color: z.string().optional(),
    group: z.string().optional(),
    order: z.string().optional(),
    width: z.string().optional(),
    dealOrder: z.string().optional(),
    cardRegion1: z.string().optional(),
    cardRegion2: z.string().optional(),
    cardRegion3: z.string().optional(),
    cardRegion4: z.string().optional(),
    cardRegion5: z.string().optional(),
    cdate: z.string().optional(),
    udate: z.string().optional()
});

const action = createAction({
    description: 'Update a deal stage in ActiveCampaign.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/update-deal-stage',
        group: 'Deals'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.put({
            // https://developers.activecampaign.com/reference/update-a-deal-stage
            endpoint: `/3/dealStages/${encodeURIComponent(input.id)}`,
            params: {
                ...(input.reorder !== undefined && { reorder: String(input.reorder) })
            },
            data: {
                dealStage: {
                    ...(input.title !== undefined && { title: input.title }),
                    ...(input.color !== undefined && { color: input.color }),
                    ...(input.group !== undefined && { group: input.group }),
                    ...(input.order !== undefined && { order: input.order }),
                    ...(input.width !== undefined && { width: input.width }),
                    ...(input.dealOrder !== undefined && { dealOrder: input.dealOrder }),
                    ...(input.cardRegion1 !== undefined && { cardRegion1: input.cardRegion1 }),
                    ...(input.cardRegion2 !== undefined && { cardRegion2: input.cardRegion2 }),
                    ...(input.cardRegion3 !== undefined && { cardRegion3: input.cardRegion3 }),
                    ...(input.cardRegion4 !== undefined && { cardRegion4: input.cardRegion4 }),
                    ...(input.cardRegion5 !== undefined && { cardRegion5: input.cardRegion5 })
                }
            },
            retries: 3
        });

        const parsed = z.object({ dealStage: ProviderDealStageSchema }).safeParse(response.data);

        if (!parsed.success) {
            throw new nango.ActionError({
                type: 'provider_response_malformed',
                message: 'Provider response did not match expected schema.',
                details: parsed.error.format()
            });
        }

        const stage = parsed.data.dealStage;

        return {
            id: stage.id,
            ...(stage.title !== undefined && { title: stage.title }),
            ...(stage.color !== undefined && { color: stage.color }),
            ...(stage.group !== undefined && { group: stage.group }),
            ...(stage.order !== undefined && { order: stage.order }),
            ...(stage.width !== undefined && { width: stage.width }),
            ...(stage.dealOrder !== undefined && { dealOrder: stage.dealOrder }),
            ...(stage.cardRegion1 !== undefined && { cardRegion1: stage.cardRegion1 }),
            ...(stage.cardRegion2 !== undefined && { cardRegion2: stage.cardRegion2 }),
            ...(stage.cardRegion3 !== undefined && { cardRegion3: stage.cardRegion3 }),
            ...(stage.cardRegion4 !== undefined && { cardRegion4: stage.cardRegion4 }),
            ...(stage.cardRegion5 !== undefined && { cardRegion5: stage.cardRegion5 }),
            ...(stage.cdate != null && { cdate: stage.cdate }),
            ...(stage.udate != null && { udate: stage.udate })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
