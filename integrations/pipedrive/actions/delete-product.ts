import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.number().int().describe('The ID of the product to delete. Example: 7')
});

const ProviderDeleteResponseSchema = z.object({
    success: z.boolean(),
    data: z
        .object({
            id: z.number().int()
        })
        .optional()
});

const OutputSchema = z.object({
    success: z.boolean(),
    id: z.number().int().optional()
});

const action = createAction({
    description: 'Delete or archive a product in Pipedrive.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/delete-product',
        group: 'Products'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['deals:full'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developers.pipedrive.com/docs/api/v1/Products#deleteProduct
        const response = await nango.delete({
            endpoint: `/v1/products/${input.id}`,
            retries: 1
        });

        if (response.status === 404) {
            throw new nango.ActionError({
                type: 'not_found',
                message: `Product with ID ${input.id} not found`,
                id: input.id
            });
        }

        if (response.status >= 400) {
            throw new nango.ActionError({
                type: 'api_error',
                message: `Failed to delete product: ${response.statusText}`,
                id: input.id,
                status: response.status
            });
        }

        const providerResponse = ProviderDeleteResponseSchema.parse(response.data);

        return {
            success: providerResponse.success,
            ...(providerResponse.data?.id !== undefined && { id: providerResponse.data.id })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
