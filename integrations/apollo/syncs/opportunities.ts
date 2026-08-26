import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const OpportunitySchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    amount: z.number().nullable().optional(),
    stage: z.string().nullable().optional(),
    updated_at: z.string().optional()
});

const CheckpointSchema = z.object({
    page: z.number().int().positive()
});

const sync = createSync({
    description: 'Sync opportunities from Apollo',
    version: '1.0.1',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        Opportunity: OpportunitySchema
    },

    // https://docs.apollo.io/reference/opportunities
    endpoints: [{ path: '/syncs/opportunities', method: 'GET' }],

    exec: async (nango) => {
        // Apollo opportunities search only exposes page-based pagination.
        // Without a changed-since filter or cursor, a full refresh is the safe sync strategy.
        const checkpoint = CheckpointSchema.safeParse(await nango.getCheckpoint());
        let resumePage = checkpoint.success ? checkpoint.data.page : 1;

        await nango.trackDeletesStart('Opportunity');

        const proxyConfig: ProxyConfiguration = {
            // https://docs.apollo.io/reference/
            endpoint: '/v1/opportunities/search',
            params: {},
            paginate: {
                type: 'offset',
                offset_name_in_request: 'page',
                offset_start_value: resumePage,
                offset_calculation_method: 'per-page',
                response_path: 'opportunities',
                limit_name_in_request: 'per_page',
                limit: 100,
                on_page: async ({ nextPageParam }) => {
                    if (typeof nextPageParam === 'number') {
                        resumePage = nextPageParam + 1;
                    }
                }
            },
            retries: 3
        };

        for await (const pageResults of nango.paginate<{
            id: string;
            name?: string | null;
            amount?: number;
            stage?: string | null;
            updated_at?: string | null;
        }>(proxyConfig)) {
            const opportunities = pageResults.map((record) => ({
                id: record.id,
                ...(record.name != null && { name: record.name }),
                ...(record.amount !== undefined && { amount: record.amount }),
                ...(record.stage != null && { stage: record.stage }),
                ...(record.updated_at != null && { updated_at: record.updated_at })
            }));

            if (opportunities.length > 0) {
                await nango.batchSave(opportunities, 'Opportunity');
            }

            await nango.saveCheckpoint({ page: resumePage });
        }

        await nango.clearCheckpoint();
        await nango.trackDeletesEnd('Opportunity');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
