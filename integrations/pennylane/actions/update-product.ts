import { createAction } from 'nango';
import { PennylaneSuccessResponse, UpdateProduct } from '../models.js';

const action = createAction({
    description: 'Action to update a product in pennylane',
    version: '2.0.0',

    endpoint: {
        method: 'PATCH',
        path: '/products',
        group: 'Products'
    },

    input: UpdateProduct,
    output: PennylaneSuccessResponse,

    exec: async (nango, input): Promise<PennylaneSuccessResponse> => {
        if (!input.source_id) {
            throw new nango.ActionError({
                message: 'source_id is a required field'
            });
        }

        const postData = {
            product: {
                ...input
            }
        };

        const { data } = await nango.put({
            // https://pennylane.readme.io/reference/products-id-put-1
            endpoint: `/api/external/v1/products/${input.source_id}`,
            data: postData,
            retries: 3
        });

        return {
            success: true,
            source_id: data.product.source_id
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
