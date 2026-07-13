import { z } from 'zod';
import { createAction } from 'nango';

const PatchOperationSchema = z.object({
    op: z.string().describe('Patch operation. Example: "replace"'),
    path: z.string().describe('JSON Pointer path. Example: "/description"'),
    value: z.unknown().optional().describe('New value for the path.')
});

const InputSchema = z.object({
    product_id: z.string().describe('The PayPal product ID. Example: "PROD-42B01413RE336243T"'),
    patch: z.array(PatchOperationSchema).describe('JSON Patch array (RFC 6902). Only description and category are patchable.')
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
