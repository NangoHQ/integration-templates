import type { CreateProduct, NangoAction, PennylaneSuccessResponse } from '../../models.js';

export default async function runAction(nango: NangoAction, input: CreateProduct): Promise<PennylaneSuccessResponse> {
    // validateCreateProduct(input, nango);
    const postData = {
        product: {
            ...input
        }
    };
    await nango.log(postData.product.source_id);

    const { data } = await nango.post({
        // https://pennylane.readme.io/reference/products-post-1
        endpoint: `/api/external/v1/products`,
        data: postData,
        retries: 10
    });

    return {
        success: true,
        source_id: data.product.source_id
    };
}
