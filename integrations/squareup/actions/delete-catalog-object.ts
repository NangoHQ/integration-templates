import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    object_id: z.string().describe('The ID of the catalog object to delete. Example: "7SB3ZQYJ5GDMVFL7JK46JCHT"')
});

const ProviderResponseSchema = z.object({
    deleted_object_ids: z.array(z.string()),
    deleted_at: z.string().optional()
});

const OutputSchema = z.object({
    deleted_object_ids: z.array(z.string()),
    deleted_at: z.string().optional()
});

const action = createAction({
    description: 'Delete a catalog object (and its child objects, e.g. variations).',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ITEMS_WRITE'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.delete({
            // https://developer.squareup.com/reference/square/catalog-api/delete-catalog-object
            endpoint: `/v2/catalog/object/${encodeURIComponent(input.object_id)}`,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Catalog object not found or could not be deleted.',
                object_id: input.object_id
            });
        }

        const providerResponse = ProviderResponseSchema.parse(response.data);

        return {
            deleted_object_ids: providerResponse.deleted_object_ids,
            ...(providerResponse.deleted_at !== undefined && { deleted_at: providerResponse.deleted_at })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
