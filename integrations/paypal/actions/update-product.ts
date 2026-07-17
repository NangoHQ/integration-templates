import { z } from 'zod';
import { createAction } from 'nango';

const PatchablePathSchema = z.enum(['/description', '/category', '/image_url', '/home_url']);

// PayPal's Catalog Products patch endpoint only documents add/replace/remove as supported operations for
// these attributes; move/copy/test are not listed and would be rejected by PayPal at runtime.
const PatchOperationSchema = z.discriminatedUnion('op', [
    z.object({ op: z.literal('add'), path: PatchablePathSchema, value: z.string() }),
    z.object({ op: z.literal('replace'), path: PatchablePathSchema, value: z.string() }),
    z.object({ op: z.literal('remove'), path: PatchablePathSchema })
]);

const InputSchema = z.object({
    product_id: z.string().describe('The PayPal product ID. Example: "PROD-42B01413RE336243T"'),
    patch: z.array(PatchOperationSchema).min(1).describe('JSON Patch array (RFC 6902). Only /description, /category, /image_url, and /home_url are patchable.')
});

const OutputSchema = z.object({
    product_id: z.string().describe('The ID of the updated product.')
});

const action = createAction({
    description: "Update a catalog product's description or category with a JSON Patch.",
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developer.paypal.com/api/catalog/v1/#products_patch
        await nango.patch({
            endpoint: `/v1/catalogs/products/${encodeURIComponent(input.product_id)}`,
            data: input.patch,
            retries: 1
        });

        return {
            product_id: input.product_id
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
