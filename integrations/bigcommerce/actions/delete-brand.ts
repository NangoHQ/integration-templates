import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    brand_id: z.number().describe('Brand ID to delete. Example: 1')
});

const OutputSchema = z.object({
    success: z.boolean(),
    brand_id: z.number()
});

const action = createAction({
    description: 'Delete a brand.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['store_v2_products'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // @allowTryCatch: We need to catch 404 HTTP errors from the provider and
        // convert them into a structured ActionError instead of letting the raw
        // AxiosError propagate to the caller.
        try {
            // https://developer.bigcommerce.com/docs/rest-management/catalog/brands#delete-a-brand
            await nango.delete({
                endpoint: `/v3/catalog/brands/${encodeURIComponent(input.brand_id)}`,
                retries: 3
            });
        } catch (error) {
            if (
                typeof error === 'object' &&
                error !== null &&
                'response' in error &&
                typeof error.response === 'object' &&
                error.response !== null &&
                'status' in error.response &&
                error.response.status === 404
            ) {
                throw new nango.ActionError({
                    type: 'not_found',
                    message: `Brand ${input.brand_id} not found.`
                });
            }
            throw error;
        }

        return {
            success: true,
            brand_id: input.brand_id
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
