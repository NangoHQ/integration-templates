import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.'),
    limit: z.number().min(1).max(100).optional().describe('Number of results per page. Max 100.'),
    customer_id: z.string().optional().describe('Filter by customer ID. Example: "AzqOd0VMyUhHQZf4"'),
    item_price_id: z.string().optional().describe('Filter by item price ID. Example: "basic-plan-monthly"'),
    status: z.string().optional().describe('Filter by subscription status. Example: "active"'),
    status_is_not: z.string().optional().describe('Exclude subscriptions with this status. Example: "cancelled"'),
    updated_at_gt: z.number().optional().describe('Filter by updated_at greater than (Unix seconds).'),
    updated_at_lt: z.number().optional().describe('Filter by updated_at less than (Unix seconds).'),
    updated_at_gte: z.number().optional().describe('Filter by updated_at greater than or equal (Unix seconds).'),
    updated_at_lte: z.number().optional().describe('Filter by updated_at less than or equal (Unix seconds).'),
    cancelled_at_gt: z.number().optional().describe('Filter by cancelled_at greater than (Unix seconds).'),
    cancelled_at_lt: z.number().optional().describe('Filter by cancelled_at less than (Unix seconds).'),
    cancelled_at_gte: z.number().optional().describe('Filter by cancelled_at greater than or equal (Unix seconds).'),
    cancelled_at_lte: z.number().optional().describe('Filter by cancelled_at less than or equal (Unix seconds).')
});

const SubscriptionSchema = z
    .object({
        id: z.string().describe('Subscription ID. Example: "AzZPdjVMyVrz9acf"'),
        customer_id: z.string().optional().describe('Customer ID. Example: "AzqOd0VMyUhHQZf4"'),
        status: z.string().optional().describe('Subscription status. Example: "active"'),
        updated_at: z.number().optional().describe('Unix timestamp in seconds. Example: 1700000000'),
        cancelled_at: z.number().optional().describe('Unix timestamp in seconds. Example: 1700000000')
    })
    .passthrough();

const OutputSchema = z.object({
    items: z.array(SubscriptionSchema),
    next_offset: z.string().optional().describe('Pagination cursor to fetch the next page. Omit when there are no more pages.')
});

const action = createAction({
    description: 'List subscriptions with optional filters.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const params: Record<string, string | number> = {
            ...(input.cursor && { offset: input.cursor }),
            ...(input.limit !== undefined && { limit: input.limit }),
            ...(input.customer_id && { 'customer_id[is]': input.customer_id }),
            ...(input.item_price_id && { 'item_price_id[is]': input.item_price_id }),
            ...(input.status && { 'status[is]': input.status }),
            ...(input.status_is_not && { 'status[is_not]': input.status_is_not }),
            ...(input.updated_at_gt !== undefined && { 'updated_at[after]': input.updated_at_gt }),
            ...(input.updated_at_lt !== undefined && { 'updated_at[lt]': input.updated_at_lt }),
            ...(input.updated_at_gte !== undefined && { 'updated_at[gte]': input.updated_at_gte }),
            ...(input.updated_at_lte !== undefined && { 'updated_at[lte]': input.updated_at_lte }),
            ...(input.cancelled_at_gt !== undefined && { 'cancelled_at[after]': input.cancelled_at_gt }),
            ...(input.cancelled_at_lt !== undefined && { 'cancelled_at[lt]': input.cancelled_at_lt }),
            ...(input.cancelled_at_gte !== undefined && { 'cancelled_at[gte]': input.cancelled_at_gte }),
            ...(input.cancelled_at_lte !== undefined && { 'cancelled_at[lte]': input.cancelled_at_lte })
        };

        // https://apidocs.chargebee.com/docs/api/subscriptions#list_subscriptions
        const response = await nango.get({
            endpoint: '/api/v2/subscriptions',
            params,
            retries: 3
        });

        const listResponse = z
            .object({
                list: z.array(z.object({ subscription: z.unknown() }).passthrough()).optional(),
                next_offset: z.string().optional()
            })
            .parse(response.data);

        const items = (listResponse.list || []).map((entry) => {
            const parsed = SubscriptionSchema.parse(entry.subscription);
            return parsed;
        });

        return {
            items,
            ...(listResponse.next_offset != null && { next_offset: listResponse.next_offset })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
