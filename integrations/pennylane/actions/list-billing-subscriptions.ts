import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.'),
    limit: z
        .number()
        .int()
        .min(1)
        .max(100)
        .optional()
        .describe('Number of items to return per request. Defaults to 20 if not specified. Must be between 1 and 100.')
});

const BillingSubscriptionSchema = z
    .object({
        id: z.union([z.number(), z.string()]),
        customer_id: z.union([z.number(), z.string()]).optional(),
        start: z.string().optional(),
        status: z.string().optional(),
        label: z.union([z.string(), z.null()]).optional(),
        payment_method: z.string().optional(),
        payment_conditions: z.string().optional()
    })
    .passthrough();

const ProviderResponseSchema = z.object({
    items: z.array(z.unknown()),
    has_more: z.boolean().optional(),
    next_cursor: z.union([z.string(), z.null()]).optional()
});

const OutputSchema = z.object({
    items: z.array(BillingSubscriptionSchema),
    next_cursor: z.string().optional(),
    has_more: z.boolean().optional()
});

const action = createAction({
    description: 'List billing subscriptions',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['billing_subscriptions:readonly'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const params: Record<string, string> = {};
        if (input.cursor !== undefined && input.cursor !== '') {
            params['cursor'] = input.cursor;
        }
        if (input.limit !== undefined) {
            params['limit'] = String(input.limit);
        }

        const response = await nango.get({
            // https://pennylane.readme.io/reference/getbillingsubscriptions
            endpoint: '/api/external/v2/billing_subscriptions',
            params,
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        const items = providerResponse.items.map((item) => {
            const parsed = BillingSubscriptionSchema.safeParse(item);
            if (!parsed.success) {
                throw new nango.ActionError({
                    type: 'invalid_provider_response',
                    message: 'Provider returned a billing subscription item that does not match the expected schema.'
                });
            }
            return parsed.data;
        });

        return {
            items,
            ...(providerResponse.has_more !== undefined && { has_more: providerResponse.has_more }),
            ...(providerResponse.next_cursor != null && { next_cursor: providerResponse.next_cursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
