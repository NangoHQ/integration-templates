import { createSync } from 'nango';
import type { ProxyConfiguration } from 'nango';
import { z } from 'zod';

const PaymentMethodSchema = z.object({
    id: z.string(),
    object: z.string().optional(),
    type: z.string(),
    created: z.number(),
    customer: z.string().nullable().optional(),
    billing_details: z.unknown().optional(),
    card: z.unknown().optional(),
    us_bank_account: z.unknown().optional(),
    sepa_debit: z.unknown().optional(),
    livemode: z.boolean(),
    metadata: z.unknown().optional()
});

const ListResponseSchema = z.object({
    object: z.string(),
    url: z.string(),
    has_more: z.boolean(),
    data: z.array(PaymentMethodSchema)
});

const CheckpointSchema = z.object({
    starting_after: z.string()
});

const sync = createSync({
    description: 'Sync payment methods from Stripe',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        PaymentMethod: PaymentMethodSchema
    },
    endpoints: [
        {
            method: 'GET',
            path: '/syncs/payment-methods'
        }
    ],
    exec: async (nango) => {
        const rawCheckpoint = await nango.getCheckpoint();
        const checkpoint = rawCheckpoint ? CheckpointSchema.safeParse(rawCheckpoint) : null;
        if (checkpoint && !checkpoint.success) {
            throw new Error(`Invalid checkpoint: ${checkpoint.error.message}`);
        }

        let hasMore = true;
        let startingAfter = checkpoint?.data.starting_after ?? '';

        while (hasMore) {
            const config: ProxyConfiguration = {
                // https://docs.stripe.com/api/payment_methods/list
                endpoint: '/v1/payment_methods',
                params: {
                    limit: 100,
                    ...(startingAfter && { starting_after: startingAfter })
                },
                retries: 3
            };

            const response = await nango.get(config);
            const parsed = ListResponseSchema.safeParse(response.data);

            if (!parsed.success) {
                throw new Error(`Failed to parse payment methods response: ${parsed.error.message}`);
            }

            const data = parsed.data;

            hasMore = data.has_more;

            if (data.data.length === 0) {
                break;
            }

            const paymentMethods = data.data.map((pm) => ({
                id: pm.id,
                object: pm.object,
                type: pm.type,
                created: pm.created,
                customer: pm.customer,
                billing_details: pm.billing_details,
                card: pm.card,
                us_bank_account: pm.us_bank_account,
                sepa_debit: pm.sepa_debit,
                livemode: pm.livemode,
                metadata: pm.metadata
            }));

            await nango.batchSave(paymentMethods, 'PaymentMethod');

            const lastElement = paymentMethods[paymentMethods.length - 1];

            if (!lastElement) {
                break;
            }

            startingAfter = lastElement.id;

            if (data.has_more) {
                await nango.saveCheckpoint({ starting_after: startingAfter });
            }
        }

        await nango.saveCheckpoint({ starting_after: '' });
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
