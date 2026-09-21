import { z } from 'zod';
import type { ProxyConfiguration } from 'nango';
import { createAction } from 'nango';

const InputSchema = z.object({});

const BalanceAmountSchema = z
    .object({
        amount: z.number(),
        currency: z.string(),
        source_types: z.record(z.string(), z.number()).optional()
    })
    .passthrough();

const BalanceSchema = z
    .object({
        object: z.literal('balance'),
        available: z.array(BalanceAmountSchema),
        pending: z.array(BalanceAmountSchema),
        connect_reserved: z.array(BalanceAmountSchema).optional(),
        instant_available: z.array(BalanceAmountSchema.extend({ net_available: z.array(z.unknown()).optional() })).optional(),
        livemode: z.boolean()
    })
    .passthrough();

const action = createAction({
    description: 'Retrieve the current account balance from Stripe, broken down by available and pending funds per currency.',
    version: '1.0.0',
    input: InputSchema,
    output: BalanceSchema,
    scopes: [],

    exec: async (nango): Promise<z.infer<typeof BalanceSchema>> => {
        const config: ProxyConfiguration = {
            // https://docs.stripe.com/api/balance/balance_retrieve
            endpoint: '/v1/balance',
            retries: 3
        };

        const response = await nango.get(config);

        const balance = BalanceSchema.parse(response.data);

        return balance;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
