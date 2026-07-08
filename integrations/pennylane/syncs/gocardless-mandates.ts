import { createSync } from 'nango';
import type { ProxyConfiguration } from 'nango';
import { z } from 'zod';

const ProviderCustomerSchema = z.object({
    id: z.number(),
    url: z.string()
});

const ProviderMandateSchema = z.object({
    id: z.number(),
    external_reference: z.string().nullable(),
    customer: ProviderCustomerSchema.nullable(),
    status: z.string(),
    external_customer_account: z.string(),
    external_customer_label: z.string().nullable(),
    created_at: z.string(),
    updated_at: z.string()
});

const PennylaneGocardlessMandateSchema = z.object({
    id: z.string(),
    external_reference: z.string().optional(),
    customer_id: z.string().optional(),
    status: z.string(),
    external_customer_account: z.string(),
    external_customer_label: z.string().optional(),
    created_at: z.string(),
    updated_at: z.string()
});

const sync = createSync({
    description: 'Sync GoCardless mandates.',
    version: '1.0.0',
    frequency: 'every 6 hours',
    autoStart: true,
    scopes: ['customer_mandates:readonly'],
    models: {
        PennylaneGocardlessMandate: PennylaneGocardlessMandateSchema
    },

    exec: async (nango) => {
        await nango.trackDeletesStart('PennylaneGocardlessMandate');

        const config: ProxyConfiguration = {
            // https://pennylane.readme.io/reference/getgocardlessmandates
            endpoint: '/api/external/v2/gocardless_mandates',
            retries: 3,
            paginate: {
                type: 'cursor',
                cursor_name_in_request: 'cursor',
                cursor_path_in_response: 'next_cursor',
                response_path: 'items',
                limit_name_in_request: 'limit',
                limit: 100
            }
        };

        for await (const items of nango.paginate(config)) {
            const mandates = [];
            for (const raw of items) {
                const parsed = ProviderMandateSchema.safeParse(raw);
                if (!parsed.success) {
                    throw new Error(`Invalid GoCardless mandate response: ${parsed.error.message}`);
                }
                const mandate = parsed.data;
                mandates.push({
                    id: String(mandate.id),
                    ...(mandate.external_reference != null && { external_reference: mandate.external_reference }),
                    ...(mandate.customer != null && { customer_id: String(mandate.customer.id) }),
                    status: mandate.status,
                    external_customer_account: mandate.external_customer_account,
                    ...(mandate.external_customer_label != null && { external_customer_label: mandate.external_customer_label }),
                    created_at: mandate.created_at,
                    updated_at: mandate.updated_at
                });
            }

            if (mandates.length > 0) {
                await nango.batchSave(mandates, 'PennylaneGocardlessMandate');
            }
        }

        await nango.trackDeletesEnd('PennylaneGocardlessMandate');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
