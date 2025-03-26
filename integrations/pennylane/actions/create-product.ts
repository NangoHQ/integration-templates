import type { CreateProduct, NangoAction, PennylaneSuccessResponse } from '../../models.js';
import { validateCreateProductSchema } from '../schema.js';

export default async function runAction(nango: NangoAction, input: CreateProduct): Promise<PennylaneSuccessResponse> {
    await nango.zodValidateInput({ zodSchema: validateCreateProductSchema, input });

    const postData = {
        product: {
            ...input
        }
    };

    const { data } = await nango.post({
        // https://pennylane.readme.io/reference/products-post-1
        endpoint: `/api/external/v1/products`,
        data: postData,
        retries: 3
    });

    return {
        success: true,
        source_id: data.product.source_id
    };
}
