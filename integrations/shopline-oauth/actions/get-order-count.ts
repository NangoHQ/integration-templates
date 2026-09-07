import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        updated_at_min: z.string().optional().describe('Minimum updated_at timestamp in ISO 8601 format.'),
        updated_at_max: z.string().optional().describe('Maximum updated_at timestamp in ISO 8601 format.'),
        created_at_min: z.string().optional().describe('Minimum created_at timestamp in ISO 8601 format.'),
        created_at_max: z.string().optional().describe('Maximum created_at timestamp in ISO 8601 format.'),
        financial_status: z.string().optional().describe('Filter by financial status, e.g. "paid".'),
        fulfillment_status: z.string().optional().describe('Filter by fulfillment status, e.g. "fulfilled".'),
        location_id: z.string().optional().describe('Filter by location ID.'),
        order_source: z.string().optional().describe('Filter by order source.'),
        status: z.string().optional().describe('Filter by order status, e.g. "open".')
    })
    .describe('Optional filters for the order count query.');

const ProviderResponseSchema = z.object({
    count: z.number()
});

const OutputSchema = z
    .object({
        count: z.number().describe('Total number of orders matching the provided filters.')
    })
    .describe('Order count response from the provider.');

/**
 * @tags: [read]
 * @tagReason: Reads the total count of orders from the provider API.
 */
const action = createAction({
    description: 'Get the total count of orders, optionally filtered.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['read_orders'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://developer.shopline.com/docs/admin-rest-api/v20260601/orders/count
            endpoint: '/admin/openapi/v20260601/orders/count.json',
            params: {
                ...(input.updated_at_min !== undefined && { updated_at_min: input.updated_at_min }),
                ...(input.updated_at_max !== undefined && { updated_at_max: input.updated_at_max }),
                ...(input.created_at_min !== undefined && { created_at_min: input.created_at_min }),
                ...(input.created_at_max !== undefined && { created_at_max: input.created_at_max }),
                ...(input.financial_status !== undefined && { financial_status: input.financial_status }),
                ...(input.fulfillment_status !== undefined && { fulfillment_status: input.fulfillment_status }),
                ...(input.location_id !== undefined && { location_id: input.location_id }),
                ...(input.order_source !== undefined && { order_source: input.order_source }),
                ...(input.status !== undefined && { status: input.status })
            },
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(typeof response.data === 'string' ? JSON.parse(response.data) : response.data);

        return {
            count: providerResponse.count
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
