import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const OpportunitySchema = z.object({
    id: z.string(),
    status_type: z.enum(['active', 'won', 'lost']).optional(),
    value: z.number().optional(),
    value_period: z.enum(['one_time', 'monthly', 'annual']).optional(),
    pipeline_id: z.string().optional(),
    lead_id: z.string().optional(),
    confidence: z.number().optional(),
    date_won: z.string().optional(),
    date_lost: z.string().optional(),
    date_updated: z.string().optional()
});

const CheckpointSchema = z.object({
    updated_after: z.string()
});

const ProviderOpportunitySchema = z.object({
    id: z.string(),
    status_type: z.enum(['active', 'won', 'lost']).nullable().optional(),
    status_id: z.string().nullable().optional(),
    value: z.number().nullable().optional(),
    value_period: z.enum(['one_time', 'monthly', 'annual']).nullable().optional(),
    pipeline_id: z.string().nullable().optional(),
    lead_id: z.string().nullable().optional(),
    confidence: z.number().nullable().optional(),
    date_won: z.string().nullable().optional(),
    date_lost: z.string().nullable().optional(),
    date_updated: z.string().nullable().optional()
});

type ProviderOpportunity = z.infer<typeof ProviderOpportunitySchema>;

const sync = createSync({
    description: 'Incrementally sync Close opportunities using date_updated checkpoints.',
    version: '1.0.0',
    frequency: 'every 5 minutes',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        Opportunity: OpportunitySchema
    },
    // https://developer.close.com/

    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint();
        const updatedAfter = checkpoint?.['updated_after'];

        const isFirstRun = !updatedAfter;

        if (isFirstRun) {
            await nango.trackDeletesStart('Opportunity');
        }

        let maxDateUpdated: string | undefined;

        const params: Record<string, string | number> = {
            _limit: 200
        };
        if (updatedAfter) {
            params['date_updated__gt'] = updatedAfter;
        }

        const proxyConfig: ProxyConfiguration = {
            // https://developer.close.com/
            endpoint: '/v1/opportunity/',
            params,
            paginate: {
                type: 'offset',
                offset_name_in_request: '_skip',
                offset_start_value: 0,
                offset_calculation_method: 'per-page',
                limit_name_in_request: '_limit',
                limit: 200,
                response_path: 'data'
            },
            retries: 3
        };

        for await (const page of nango.paginate<ProviderOpportunity>(proxyConfig)) {
            const opportunities = page.map((record) => {
                const validated = ProviderOpportunitySchema.safeParse(record);
                if (!validated.success) {
                    throw new Error(`Invalid opportunity record: ${validated.error.message}`);
                }

                const r = validated.data;
                return {
                    id: r.id,
                    ...(r.status_type != null && { status_type: r.status_type }),
                    ...(r.value != null && { value: r.value }),
                    ...(r.value_period != null && { value_period: r.value_period }),
                    ...(r.pipeline_id != null && { pipeline_id: r.pipeline_id }),
                    ...(r.lead_id != null && { lead_id: r.lead_id }),
                    ...(r.confidence != null && { confidence: r.confidence }),
                    ...(r.date_won != null && { date_won: r.date_won }),
                    ...(r.date_lost != null && { date_lost: r.date_lost }),
                    ...(r.date_updated != null && { date_updated: r.date_updated })
                };
            });

            if (opportunities.length === 0) {
                continue;
            }

            await nango.batchSave(opportunities, 'Opportunity');

            for (const opp of opportunities) {
                if (opp.date_updated && (maxDateUpdated === undefined || opp.date_updated > maxDateUpdated)) {
                    maxDateUpdated = opp.date_updated;
                }
            }

            if (maxDateUpdated) {
                await nango.saveCheckpoint({ updated_after: maxDateUpdated });
            }
        }

        if (isFirstRun) {
            await nango.trackDeletesEnd('Opportunity');
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
