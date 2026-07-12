import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const ProviderSepaMandateSchema = z.object({
    id: z.number(),
    bank: z.string().nullable(),
    bic: z.string(),
    iban: z.string(),
    sequence_type: z.string(),
    signed_at: z.string(),
    identifier: z.string(),
    customer: z.object({
        id: z.number(),
        url: z.string()
    }),
    created_at: z.string(),
    updated_at: z.string()
});

const SepaMandateSchema = z.object({
    id: z.string(),
    bank: z.string().optional(),
    bic: z.string(),
    iban: z.string(),
    sequence_type: z.string(),
    signed_at: z.string(),
    identifier: z.string(),
    customer_id: z.string(),
    customer_url: z.string().optional(),
    created_at: z.string(),
    updated_at: z.string()
});

const sync = createSync({
    description: 'Sync SEPA mandates.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    models: {
        SepaMandate: SepaMandateSchema
    },

    exec: async (nango) => {
        const proxyConfig: ProxyConfiguration = {
            // https://pennylane.readme.io/reference/getsepamandates
            endpoint: '/api/external/v2/sepa_mandates',
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

        await nango.trackDeletesStart('SepaMandate');

        for await (const batch of nango.paginate(proxyConfig)) {
            if (!Array.isArray(batch)) {
                throw new Error('Expected batch to be an array');
            }

            const mandates = [];
            for (const item of batch) {
                const parsed = ProviderSepaMandateSchema.safeParse(item);
                if (!parsed.success) {
                    throw new Error(`Failed to parse SEPA mandate: ${parsed.error.message}`);
                }

                const record = parsed.data;
                mandates.push({
                    id: String(record.id),
                    ...(record.bank != null && { bank: record.bank }),
                    bic: record.bic,
                    iban: record.iban,
                    sequence_type: record.sequence_type,
                    signed_at: record.signed_at,
                    identifier: record.identifier,
                    customer_id: String(record.customer.id),
                    customer_url: record.customer.url,
                    created_at: record.created_at,
                    updated_at: record.updated_at
                });
            }

            if (mandates.length > 0) {
                await nango.batchSave(mandates, 'SepaMandate');
            }
        }

        await nango.trackDeletesEnd('SepaMandate');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
