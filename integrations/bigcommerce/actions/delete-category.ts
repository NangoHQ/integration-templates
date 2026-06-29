import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    category_id: z.number().describe('Category ID. Example: 23')
});

const OutputSchema = z.object({
    success: z.boolean()
});

const action = createAction({
    description: 'Delete a category.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/delete-category'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['store_v2_products'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.delete({
            // https://developer.bigcommerce.com/docs/rest-management/catalog/categories#delete-a-category
            endpoint: `/v3/catalog/categories/${encodeURIComponent(input.category_id)}`,
            retries: 3
        });

        return {
            success: response.status === 204 || response.status === 200
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
