import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        product_id: z.string().describe('The unique identifier of the product that owns the image to delete. Example: "16076831074833682966241755"'),
        image_id: z.string().describe('The unique identifier of the image to delete. Example: "16076831074833682966241756"')
    })
    .describe('Input for deleting a product image');

const OutputSchema = z.object({}).describe('Empty response confirming the image was deleted');

/**
 * @tags: [write, destructive]
 * @tagReason: Permanently deletes a product image from the provider.
 */
const action = createAction({
    description: 'Delete a product image',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        await nango.delete({
            // https://developer.shopline.com/docs/admin-rest-api/v20260601/product/image/delete
            endpoint: `/admin/openapi/v20260601/products/${encodeURIComponent(input.product_id)}/images/${encodeURIComponent(input.image_id)}.json`,
            retries: 3
        });

        return {};
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
