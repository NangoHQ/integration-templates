import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        status: z.string().optional().describe('Filter by product status, such as "active" or "draft".'),
        product_type: z.string().optional().describe('Filter by product type.'),
        vendor: z.string().optional().describe('Filter by product vendor.'),
        created_at_min: z.string().optional().describe('Filter products created after this ISO 8601 timestamp.'),
        created_at_max: z.string().optional().describe('Filter products created before this ISO 8601 timestamp.'),
        updated_at_min: z.string().optional().describe('Filter products updated after this ISO 8601 timestamp.'),
        updated_at_max: z.string().optional().describe('Filter products updated before this ISO 8601 timestamp.'),
        collection_id: z.string().optional().describe('Filter by collection ID.')
    })
    .describe('Input for getting the total count of products, optionally filtered.');

const OutputSchema = z
    .object({
        count: z.number().describe('The total number of products matching the applied filters.')
    })
    .describe('Output containing the total count of products matching the applied filters.');

/**
 * @tags: [read]
 * @tagReason: Only reads the product count from the provider.
 */
const action = createAction({
    description: 'Get the total count of products, optionally filtered.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['read_products'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const params: Record<string, string> = {};
        if (input.status !== undefined) {
            params['status'] = input.status;
        }
        if (input.product_type !== undefined) {
            params['product_type'] = input.product_type;
        }
        if (input.vendor !== undefined) {
            params['vendor'] = input.vendor;
        }
        if (input.created_at_min !== undefined) {
            params['created_at_min'] = input.created_at_min;
        }
        if (input.created_at_max !== undefined) {
            params['created_at_max'] = input.created_at_max;
        }
        if (input.updated_at_min !== undefined) {
            params['updated_at_min'] = input.updated_at_min;
        }
        if (input.updated_at_max !== undefined) {
            params['updated_at_max'] = input.updated_at_max;
        }
        if (input.collection_id !== undefined) {
            params['collection_id'] = input.collection_id;
        }

        // https://developer.shopline.com/docs/admin-rest-api/v20260601/product/product/count
        const response = await nango.get({
            endpoint: '/admin/openapi/v20260601/products/count.json',
            params,
            retries: 3
        });

        const body = z.object({ count: z.number() }).parse(response.data);

        return {
            count: body.count
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
