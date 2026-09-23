import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        ids: z.string().optional().describe('Comma-separated list of order IDs to filter by (max 100).'),
        name: z.string().optional().describe('Filter by order name.'),
        since_id: z.string().optional().describe('Return orders with IDs greater than this value.'),
        cursor: z.string().optional().describe('Pagination cursor (page_info) from the previous response. Omit for the first page.'),
        limit: z.number().int().min(1).max(100).optional().describe('Number of results per page (1-100, default 20).'),
        created_at_min: z.string().optional().describe('Minimum creation date in ISO 8601 format.'),
        created_at_max: z.string().optional().describe('Maximum creation date in ISO 8601 format.'),
        updated_at_min: z.string().optional().describe('Minimum update date in ISO 8601 format.'),
        updated_at_max: z.string().optional().describe('Maximum update date in ISO 8601 format.'),
        order_at_min: z.string().optional().describe('Minimum order date in ISO 8601 format.'),
        order_at_max: z.string().optional().describe('Maximum order date in ISO 8601 format.'),
        financial_status: z.string().optional().describe('Filter by financial status (e.g., paid, pending, refunded).'),
        fulfillment_status: z.string().optional().describe('Filter by fulfillment status (e.g., fulfilled, partial, unfulfilled).'),
        status: z.string().optional().describe('Filter by order status (e.g., open, closed, cancelled).'),
        email: z.string().optional().describe('Filter by customer email address.'),
        buyer_id: z.string().optional().describe('Filter by buyer ID.'),
        location: z.string().optional().describe('Filter by location.'),
        search_content: z.string().optional().describe('Search content filter.'),
        sort_condition: z.string().optional().describe('Sort condition for results.'),
        contract_ids: z.string().optional().describe('Comma-separated list of contract IDs.'),
        hidden_order: z.boolean().optional().describe('Filter by hidden order status.'),
        fields: z.string().optional().describe('Comma-separated list of fields to include in the response.')
    })
    .describe('Input for listing orders with filtering and pagination.');

const ProviderResponseSchema = z.object({
    orders: z.array(z.object({}).passthrough())
});

const OutputSchema = z
    .object({
        orders: z.array(z.object({}).passthrough()).describe('List of orders matching the query filters.'),
        next_cursor: z.string().optional().describe('Pagination cursor for the next page. Absent when there are no more pages.')
    })
    .describe('Output containing the list of orders and pagination cursor.');

/**
 * @tags: [read]
 * @tagReason: Retrieves a list of orders from the provider with optional filtering and pagination.
 * @pitfalls: Order tags in returned objects are JSON-array-encoded strings rather than plain strings or arrays, so they must be parsed before use.
 */
const action = createAction({
    description: 'List orders with filtering and pagination.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['read_orders'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developer.shopline.com/docs/admin-rest-api/v20260601/orders/orders/orders-query
        const response = await nango.get({
            endpoint: '/admin/openapi/v20260601/orders.json',
            params: {
                ...(input.ids !== undefined && { ids: input.ids }),
                ...(input.name !== undefined && { name: input.name }),
                ...(input.since_id !== undefined && { since_id: input.since_id }),
                ...(input.cursor !== undefined && { page_info: input.cursor }),
                ...(input.limit !== undefined && { limit: String(input.limit) }),
                ...(input.created_at_min !== undefined && { created_at_min: input.created_at_min }),
                ...(input.created_at_max !== undefined && { created_at_max: input.created_at_max }),
                ...(input.updated_at_min !== undefined && { updated_at_min: input.updated_at_min }),
                ...(input.updated_at_max !== undefined && { updated_at_max: input.updated_at_max }),
                ...(input.order_at_min !== undefined && { order_at_min: input.order_at_min }),
                ...(input.order_at_max !== undefined && { order_at_max: input.order_at_max }),
                ...(input.financial_status !== undefined && { financial_status: input.financial_status }),
                ...(input.fulfillment_status !== undefined && { fulfillment_status: input.fulfillment_status }),
                ...(input.status !== undefined && { status: input.status }),
                ...(input.email !== undefined && { email: input.email }),
                ...(input.buyer_id !== undefined && { buyer_id: input.buyer_id }),
                ...(input.location !== undefined && { location: input.location }),
                ...(input.search_content !== undefined && { search_content: input.search_content }),
                ...(input.sort_condition !== undefined && { sort_condition: input.sort_condition }),
                ...(input.contract_ids !== undefined && { contract_ids: input.contract_ids }),
                ...(input.hidden_order !== undefined && { hidden_order: String(input.hidden_order) }),
                ...(input.fields !== undefined && { fields: input.fields })
            },
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        let next_cursor: string | undefined;
        const linkHeader = response.headers['link'] || response.headers['Link'];
        if (typeof linkHeader === 'string') {
            const nextLink = linkHeader.split(',').find((part) => part.includes('rel="next"'));
            if (nextLink) {
                const match = nextLink.match(/page_info=([^&>]+)/);
                if (match && match[1]) {
                    next_cursor = decodeURIComponent(match[1]);
                }
            }
        }

        return {
            orders: providerResponse.orders,
            ...(next_cursor !== undefined && { next_cursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
