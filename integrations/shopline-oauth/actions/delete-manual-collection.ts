import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        custom_collection_id: z.string().describe('The unique identifier of the manual collection to delete.')
    })
    .describe('Input for deleting a manual collection.');

const OutputSchema = z.null().describe('Empty response indicating the manual collection was successfully deleted.');

/**
 * @tags: [write, destructive]
 * @tagReason: Permanently deletes a manual collection from the provider. This action is irreversible and cascades to remove all product associations under the collection, but does not delete the products themselves.
 */
const action = createAction({
    description: 'Delete a manual collection.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        await nango.delete({
            // https://developer.shopline.com/docs/admin-rest-api/v20260601/products/custom-collections/delete-custom-collection
            endpoint: `/admin/openapi/v20260601/products/custom_collections/${encodeURIComponent(input.custom_collection_id)}.json`,
            retries: 3
        });

        return null;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
