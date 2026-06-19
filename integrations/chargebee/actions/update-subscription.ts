import { z } from 'zod';
import { createAction } from 'nango';

const SubscriptionItemInputSchema = z.object({
    item_price_id: z.string().describe('Item price ID to assign. Example: "basic-plan-monthly"'),
    quantity: z.number().int().min(1).optional().describe('Quantity of the item. Omit for on-off plans/addons. Example: 2')
});

const InputSchema = z.object({
    subscription_id: z.string().describe('Chargebee subscription ID. Example: "AzqOd0VMyVsW3aOz"'),
    subscription_items: z.array(SubscriptionItemInputSchema).min(1).describe('List of subscription items to set'),
    replace_items_list: z.boolean().optional().describe('When true, replaces the entire subscription item list. Default: true'),
    proration: z.boolean().optional().describe('Whether to prorate changes. Default: true')
});

const SubscriptionItemSchema = z.object({
    item_price_id: z.string(),
    quantity: z.number().int().optional(),
    unit_price: z.number().int().optional(),
    amount: z.number().int().optional(),
    item_type: z.string().optional()
});

const OutputSchema = z.object({
    id: z.string().describe('Subscription ID'),
    status: z.string().describe('Subscription status'),
    customer_id: z.string().describe('Customer ID'),
    subscription_items: z.array(SubscriptionItemSchema).describe('Updated subscription items'),
    current_term_start: z.number().int().optional().describe('Current term start (Unix seconds)'),
    current_term_end: z.number().int().optional().describe('Current term end (Unix seconds)'),
    next_billing_at: z.number().int().optional().describe('Next billing date (Unix seconds)'),
    created_at: z.number().int().optional().describe('Creation timestamp (Unix seconds)'),
    updated_at: z.number().int().optional().describe('Last update timestamp (Unix seconds)')
});

const action = createAction({
    description: 'Update an active subscription (Product Catalog 2.0)',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const params: Record<string, string | number> = {
            replace_items_list: input.replace_items_list !== false ? 'true' : 'false'
        };

        if (input.proration !== undefined) {
            params['proration'] = input.proration ? 'true' : 'false';
        }

        for (const [i, item] of input.subscription_items.entries()) {
            params[`subscription_items[item_price_id][${i}]`] = item.item_price_id;
            if (item.quantity !== undefined) {
                params[`subscription_items[quantity][${i}]`] = item.quantity;
            }
        }

        const response = await nango.post({
            // https://apidocs.chargebee.com/docs/api/subscriptions?prod_catalog_v2=1#update_subscription_for_items
            endpoint: `/api/v2/subscriptions/${encodeURIComponent(input.subscription_id)}/update_for_items`,
            params,
            retries: 3
        });

        if (!response.data || typeof response.data !== 'object' || !('subscription' in response.data)) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Unexpected response from Chargebee: missing subscription object'
            });
        }

        const rawSubscription = response.data.subscription;

        const parsedSubscription = z
            .object({
                id: z.string(),
                status: z.string(),
                customer_id: z.string(),
                subscription_items: z
                    .array(
                        z.object({
                            item_price_id: z.string(),
                            quantity: z.number().int().optional().nullable(),
                            unit_price: z.number().int().optional().nullable(),
                            amount: z.number().int().optional().nullable(),
                            item_type: z.string().optional().nullable()
                        })
                    )
                    .optional()
                    .nullable(),
                current_term_start: z.number().int().optional().nullable(),
                current_term_end: z.number().int().optional().nullable(),
                next_billing_at: z.number().int().optional().nullable(),
                created_at: z.number().int().optional().nullable(),
                updated_at: z.number().int().optional().nullable()
            })
            .parse(rawSubscription);

        return {
            id: parsedSubscription.id,
            status: parsedSubscription.status,
            customer_id: parsedSubscription.customer_id,
            subscription_items: (parsedSubscription.subscription_items || []).map((item) => ({
                item_price_id: item.item_price_id,
                ...(item.quantity != null && { quantity: item.quantity }),
                ...(item.unit_price != null && { unit_price: item.unit_price }),
                ...(item.amount != null && { amount: item.amount }),
                ...(item.item_type != null && { item_type: item.item_type })
            })),
            ...(parsedSubscription.current_term_start != null && {
                current_term_start: parsedSubscription.current_term_start
            }),
            ...(parsedSubscription.current_term_end != null && {
                current_term_end: parsedSubscription.current_term_end
            }),
            ...(parsedSubscription.next_billing_at != null && {
                next_billing_at: parsedSubscription.next_billing_at
            }),
            ...(parsedSubscription.created_at != null && {
                created_at: parsedSubscription.created_at
            }),
            ...(parsedSubscription.updated_at != null && {
                updated_at: parsedSubscription.updated_at
            })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
