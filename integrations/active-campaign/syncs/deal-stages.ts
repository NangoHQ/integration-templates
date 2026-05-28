import { createSync, ProxyConfiguration } from 'nango';
import { z } from 'zod';

const ProviderDealStageSchema = z.object({
    id: z.string(),
    title: z.string(),
    color: z.string().optional(),
    order: z.string().optional(),
    group: z.string().optional(),
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

const DealStageSchema = z.object({
    id: z.string(),
    title: z.string(),
    color: z.string().optional(),
    order: z.string().optional(),
    group: z.string().optional(),
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

const sync = createSync({
    description: 'Sync deal stages from ActiveCampaign.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    models: {
        DealStage: DealStageSchema
    },
    endpoints: [{ method: 'GET', path: '/syncs/deal-stages' }],

    exec: async (nango) => {
        // Blocker: The ActiveCampaign GET /api/3/dealStages endpoint does not support
        // an updated_after filter, cursor, or since_id parameter. It only supports
        // limit/offset pagination and title/pipeline filters, so incremental
        // checkpoints are not possible.
        await nango.trackDeletesStart('DealStage');

        const proxyConfig: ProxyConfiguration = {
            // https://developers.activecampaign.com/reference/list-all-deal-stages
            endpoint: '/3/dealStages',
            paginate: {
                type: 'offset',
                limit_name_in_request: 'limit',
                limit: 100,
                offset_name_in_request: 'offset',
                offset_start_value: 0,
                offset_calculation_method: 'by-response-size',
                response_path: 'dealStages'
            },
            retries: 3
        };

        for await (const page of nango.paginate(proxyConfig)) {
            const dealStages = page.map((record) => {
                const parsed = ProviderDealStageSchema.safeParse(record);
                if (!parsed.success) {
                    throw new Error(`Failed to parse deal stage: ${parsed.error.message}`);
                }
                const stage = parsed.data;
                return {
                    id: stage.id,
                    title: stage.title,
                    ...(stage.color != null && { color: stage.color }),
                    ...(stage.order != null && { order: stage.order }),
                    ...(stage.group != null && { group: stage.group }),
                    ...(stage.width != null && { width: stage.width }),
                    ...(stage.dealOrder != null && { dealOrder: stage.dealOrder }),
                    ...(stage.cardRegion1 != null && { cardRegion1: stage.cardRegion1 }),
                    ...(stage.cardRegion2 != null && { cardRegion2: stage.cardRegion2 }),
                    ...(stage.cardRegion3 != null && { cardRegion3: stage.cardRegion3 }),
                    ...(stage.cardRegion4 != null && { cardRegion4: stage.cardRegion4 }),
                    ...(stage.cardRegion5 != null && { cardRegion5: stage.cardRegion5 }),
                    ...(stage.cdate != null && { cdate: stage.cdate }),
                    ...(stage.udate != null && { udate: stage.udate })
                };
            });

            if (dealStages.length > 0) {
                await nango.batchSave(dealStages, 'DealStage');
            }
        }

        await nango.trackDeletesEnd('DealStage');
    }
});

export default sync;
