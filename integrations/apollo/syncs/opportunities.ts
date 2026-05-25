import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const OpportunitySchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    amount: z.number().nullable().optional(),
    stage: z.string().nullable().optional(),
    updated_at: z.string().optional()
});

const sync = createSync({
    description: 'Sync opportunities from Apollo',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    models: {
        Opportunity: OpportunitySchema
    },

    // https://docs.apollo.io/reference/opportunities
    endpoints: [{ path: '/syncs/opportunities', method: 'GET' }],

    exec: async (nango) => {
        // Apollo opportunities search only exposes page-based pagination.
        // Without a changed-since filter or cursor, a full refresh is the safe sync strategy.
        await nango.trackDeletesStart('Opportunity');

        const proxyConfig: ProxyConfiguration = {
            // https://docs.apollo.io/reference/
            endpoint: '/v1/opportunities/search',
            params: {},
            paginate: {
                type: 'offset',
                offset_name_in_request: 'page',
                offset_start_value: 1,
                offset_calculation_method: 'per-page',
                response_path: 'opportunities',
                limit_name_in_request: 'per_page',
                limit: 100
            },
            retries: 3
        };

        for await (const page of nango.paginate<{
            id: string;
            name?: string | null;
            amount?: number;
            stage?: string | null;
            updated_at?: string | null;
        }>(proxyConfig)) {
            const opportunities = page.map((record) => ({
                id: record.id,
                ...(record.name != null && { name: record.name }),
                ...(record.amount !== undefined && { amount: record.amount }),
                ...(record.stage != null && { stage: record.stage }),
                ...(record.updated_at != null && { updated_at: record.updated_at })
            }));

            if (opportunities.length === 0) {
                continue;
            }

            await nango.batchSave(opportunities, 'Opportunity');
        }

        await nango.trackDeletesEnd('Opportunity');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
