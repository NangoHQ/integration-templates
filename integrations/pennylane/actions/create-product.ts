import type { CreateProduct, NangoAction, PennylaneSuccessResponse } from '../../models.js';
import { validateCreateProductSchema } from '../schema.zod.js';

export default async function runAction(nango: NangoAction, input: CreateProduct): Promise<PennylaneSuccessResponse> {
    const parsedInput = validateCreateProductSchema.safeParse(input);
    if (!parsedInput.success) {
        for (const error of parsedInput.error.errors) {
            await nango.log(`Invalid input provided to create an invoice: ${error.message} at path ${error.path.join('.')}`, { level: 'error' });
        }
        throw new nango.ActionError({
            message: 'Invalid input provided to create an invoice'
        });
    }
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
