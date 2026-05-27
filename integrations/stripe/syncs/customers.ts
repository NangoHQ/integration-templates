import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const CustomerSchema = z.object({
    id: z.string(),
    object: z.string().optional(),
    address: z.unknown().optional(),
    balance: z.number().optional(),
    created: z.number(),
    currency: z.string().nullable().optional(),
    default_source: z.string().nullable().optional(),
    delinquent: z.boolean().optional(),
    description: z.string().nullable().optional(),
    email: z.string().nullable().optional(),
    invoice_prefix: z.string().optional(),
    invoice_settings: z.unknown().optional(),
    livemode: z.boolean().optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
    name: z.string().nullable().optional(),
    next_invoice_sequence: z.number().optional(),
    phone: z.string().nullable().optional(),
    preferred_locales: z.array(z.string()).optional(),
    shipping: z.unknown().optional(),
    tax_exempt: z.string().optional(),
    test_clock: z.string().nullable().optional()
});

const CheckpointSchema = z.object({
    created_after: z.number()
});

const PageSchema = z.object({
    object: z.string(),
    data: z.array(z.unknown()),
    has_more: z.boolean(),
    url: z.string().optional()
});

const sync = createSync({
    description: 'Sync customers from Stripe. Incrementally fetches newly created customers using a creation-time checkpoint. Updates to existing customers are not captured; use a customer-events sync for update tracking.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        Customer: CustomerSchema
    },
    endpoints: [
        {
            method: 'GET',
            path: '/syncs/customers'
        }
    ],

    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint();
        const parsedCheckpoint = CheckpointSchema.safeParse(checkpoint);
        const createdAfter = parsedCheckpoint.success ? parsedCheckpoint.data.created_after : undefined;
        let maxCreated: number | undefined;

        const baseParams: Record<string, string | number> = {
            limit: 100
        };
        if (createdAfter !== undefined) {
            baseParams['created[gte]'] = createdAfter;
        }

        let hasMore = true;
        let startingAfter: string | undefined;

        while (hasMore) {
            const proxyConfig: ProxyConfiguration = {
                // https://docs.stripe.com/api/customers/list
                endpoint: '/v1/customers',
                params: {
                    ...baseParams,
                    ...(startingAfter && { starting_after: startingAfter })
                },
                retries: 3
            };

            const response = await nango.get(proxyConfig);
            const page = PageSchema.parse(response.data);

            const customers = page.data.map((item) => {
                return CustomerSchema.parse(item);
            });

            if (customers.length > 0) {
                await nango.batchSave(customers, 'Customer');

                for (const customer of customers) {
                    if (maxCreated === undefined || customer.created > maxCreated) {
                        maxCreated = customer.created;
                    }
                }

                const lastCustomer = customers[customers.length - 1];
                if (lastCustomer) {
                    startingAfter = lastCustomer.id;
                }
            }

            hasMore = page.has_more;
            if (customers.length === 0) {
                hasMore = false;
            }
        }

        if (maxCreated !== undefined) {
            await nango.saveCheckpoint({ created_after: maxCreated });
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
