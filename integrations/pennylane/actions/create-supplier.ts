import type { CreateSupplier, NangoAction, PennylaneSuccessResponse } from '../../models.js';
import { createSupplierSchema } from '../schema.js';

export default async function runAction(nango: NangoAction, input: CreateSupplier): Promise<PennylaneSuccessResponse> {
    const parsedInput = createSupplierSchema.safeParse(input);
    if (!parsedInput.success) {
        for (const error of parsedInput.error.errors) {
            await nango.log(`Invalid input provided to create a supplier: ${error.message} at path ${error.path.join('.')}`, { level: 'error' });
        }
        throw new nango.ActionError({
            message: 'Invalid input provided to create a supplier'
        });
    }

    const postData = {
        supplier: {
            ...input
        }
    };

    const { data } = await nango.post({
        // https://pennylane.readme.io/reference/suppliers-post
        endpoint: `/api/external/v1/suppliers`,
        data: postData,
        retries: 10
    });

    return {
        success: true,
        source_id: data.supplier.source_id
    };
}
