import type { NangoAction, PennylaneSuccessResponse, UpdateProduct } from '../../models.js';

export default async function runAction(nango: NangoAction, input: UpdateProduct): Promise<PennylaneSuccessResponse> {
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
