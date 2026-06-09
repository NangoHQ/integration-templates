import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    item_id: z.string().describe('The unique ID of the item to delete. Example: "260815000000100002"')
});

const ProviderDeleteResponseSchema = z.object({
    code: z.number(),
    message: z.string().optional()
});

const OutputSchema = z.object({
    success: z.boolean(),
    item_id: z.string(),
    message: z.string().optional()
});

const action = createAction({
    description: 'Delete or archive an item in Zoho Books.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/delete-item',
        group: 'Items'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ZohoBooks.items.DELETE'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const metadata = await nango.getMetadata<{ organization_id?: string }>();
        const organizationId = metadata?.organization_id;

        if (!organizationId) {
            throw new nango.ActionError({
                type: 'missing_metadata',
                message: 'organization_id is required in metadata.'
            });
        }

        const response = await nango.delete({
            // https://www.zoho.com/books/api/v3/items/#delete-an-item
            endpoint: `/books/v3/items/${encodeURIComponent(input.item_id)}`,
            params: {
                organization_id: organizationId
            },
            retries: 1
        });

        const parsed = ProviderDeleteResponseSchema.safeParse(response.data);
        if (!parsed.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Unexpected response from Zoho Books API when deleting item.',
                item_id: input.item_id
            });
        }

        const providerData = parsed.data;

        if (providerData.code !== 0) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: providerData.message || 'Failed to delete item in Zoho Books.',
                item_id: input.item_id,
                provider_code: providerData.code
            });
        }

        return {
            success: true,
            item_id: input.item_id,
            message: providerData.message
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
