import { createAction } from 'nango';
import * as z from 'zod';

/**
 * @tags: [write, destructive]
 * @tagReason: Deletes a product-collection relationship from the provider.
 * @pitfalls: Only manual collections support collect-based membership; smart collections have no collect rows because product inclusion is computed from rules.
 */
const action = createAction({
    description: 'Remove a single product-collection relationship ("collect") by its ID',
    version: '1.0.0',
    input: z
        .object({
            collect_id: z.string().describe('The unique ID of the collect to remove.')
        })
        .describe('Input for removing a product from a collection by collect ID.'),
    output: z.null().describe('Empty response indicating the collect was removed.'),
    scopes: ['write_products'],

    exec: async (nango, input) => {
        // https://developer.shopline.com/docs/admin-rest-api/v20260601/product/collect/delete-collect
        await nango.delete({
            endpoint: `/admin/openapi/v20260601/products/collects/${encodeURIComponent(input.collect_id)}.json`,
            retries: 3
        });

        return null;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
