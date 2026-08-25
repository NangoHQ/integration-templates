import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const ProviderFiscalYearSchema = z.object({
    id: z.number().int(),
    start: z.string(),
    finish: z.string(),
    status: z.enum(['open', 'reopen', 'closed', 'frozen']),
    created_at: z.string(),
    updated_at: z.string()
});

const FiscalYearSchema = z.object({
    id: z.string(),
    start: z.string(),
    finish: z.string(),
    status: z.string(),
    created_at: z.string(),
    updated_at: z.string()
});

const CheckpointSchema = z.object({
    cursor: z.string()
});

const sync = createSync({
    description: 'Sync company fiscal years.',
    version: '1.0.1',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        FiscalYear: FiscalYearSchema
    },

    exec: async (nango) => {
        const rawCheckpoint = await nango.getCheckpoint();
        const checkpoint = rawCheckpoint ? CheckpointSchema.parse(rawCheckpoint) : undefined;
        let cursor: string | undefined = checkpoint ? checkpoint['cursor'] : undefined;

        await nango.trackDeletesStart('FiscalYear');

        const proxyConfig: ProxyConfiguration = {
            // https://pennylane.readme.io/reference/company-fiscal-years
            endpoint: '/api/external/v2/fiscal_years',
            params: {
                ...(cursor && { cursor })
            },
            paginate: {
                type: 'cursor',
                cursor_name_in_request: 'cursor',
                cursor_path_in_response: 'next_cursor',
                response_path: 'items',
                limit_name_in_request: 'limit',
                limit: 100,
                on_page: async ({ nextPageParam }) => {
                    cursor = typeof nextPageParam === 'string' ? nextPageParam : undefined;
                }
            },
            retries: 3
        };

        for await (const page of nango.paginate(proxyConfig)) {
            const validated = z.array(ProviderFiscalYearSchema).safeParse(page);

            if (!validated.success) {
                throw new Error(`Failed to parse fiscal years page: ${validated.error.message}`);
            }

            const fiscalYears = validated.data.map((record) => ({
                id: String(record.id),
                start: record.start,
                finish: record.finish,
                status: record.status,
                created_at: record.created_at,
                updated_at: record.updated_at
            }));

            await nango.batchSave(fiscalYears, 'FiscalYear');

            if (cursor) {
                await nango.saveCheckpoint({ cursor });
            }
        }

        await nango.clearCheckpoint();
        await nango.trackDeletesEnd('FiscalYear');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
