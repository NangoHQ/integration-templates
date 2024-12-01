import type { CreateSupplier, NangoAction, PennylaneSuccessResponse } from '../../models.js';

export default async function runAction(nango: NangoAction, input: CreateSupplier): Promise<PennylaneSuccessResponse> {
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
