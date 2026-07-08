import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const ProviderBankEstablishmentSchema = z.object({
    id: z.number().int(),
    name: z.string().optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional()
});

const BankEstablishmentSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional()
});

const sync = createSync({
    description: 'Sync bank establishments',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    models: {
        BankEstablishment: BankEstablishmentSchema
    },

    exec: async (nango) => {
        // Blocker: provider only exposes /bank_establishments with no changed-since filter,
        // no deleted-record endpoint, and no resumable cursor across runs (cursors are temporary).
        await nango.trackDeletesStart('BankEstablishment');

        const proxyConfig: ProxyConfiguration = {
            // https://pennylane.readme.io/reference/getbankestablishments
            endpoint: '/api/external/v2/bank_establishments',
            paginate: {
                type: 'cursor',
                cursor_name_in_request: 'cursor',
                cursor_path_in_response: 'next_cursor',
                response_path: 'items',
                limit_name_in_request: 'limit',
                limit: 100
            },
            retries: 3
        };

        for await (const page of nango.paginate(proxyConfig)) {
            const parsed = z.array(ProviderBankEstablishmentSchema).safeParse(page);

            if (!parsed.success) {
                throw new Error(`Failed to parse bank establishments: ${parsed.error.message}`);
            }

            const establishments = parsed.data.map((record) => ({
                id: String(record.id),
                ...(record.name != null && { name: record.name }),
                ...(record.created_at != null && { created_at: record.created_at }),
                ...(record.updated_at != null && { updated_at: record.updated_at })
            }));

            if (establishments.length > 0) {
                await nango.batchSave(establishments, 'BankEstablishment');
            }
        }

        await nango.trackDeletesEnd('BankEstablishment');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
