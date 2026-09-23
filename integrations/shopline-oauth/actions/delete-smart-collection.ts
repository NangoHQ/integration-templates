import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        smart_collection_id: z.string().describe('The unique identifier of the smart collection to delete.')
    })
    .describe('Input for deleting a smart collection.');

const OutputSchema = z
    .object({
        success: z.boolean().describe('Whether the smart collection was successfully deleted.')
    })
    .describe('Output confirming deletion of a smart collection.');

/**
 * @tags: [write, destructive]
 * @tagReason: Permanently deletes a smart collection from the store.
 * @pitfalls: Deleting a smart collection removes only the rule-based filter; it does not delete or modify any products that previously matched its rules.
 */
const action = createAction({
    description: 'Delete a smart collection.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['write_products'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        await nango.delete({
            // https://developer.shopline.com/docs/admin-rest-api/v20260601/products/smart-collection/delete-smart-collection
            endpoint: `/admin/openapi/v20260601/products/smart_collections/${encodeURIComponent(input.smart_collection_id)}.json`,
            retries: 3
        });

        return { success: true };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
