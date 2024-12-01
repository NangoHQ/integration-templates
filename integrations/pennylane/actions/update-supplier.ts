import type { NangoAction, PennylaneSuccessResponse, UpdateSupplier, UpdateSupplierResponse } from '../../models.js';

export default async function runAction(nango: NangoAction, input: UpdateSupplier): Promise<PennylaneSuccessResponse> {
    if (!input.source_id) {
        throw new nango.ActionError({
            message: 'source_id (supplier source_id) is a required field'
        });
    }

    type supplierUpdate = Omit<UpdateSupplier, 'source_id'>;
    const { source_id, ...rest } = input;
    const supplierData: supplierUpdate = { ...rest };

    const postData = {
        supplier: {
            ...supplierData
        }
    };

    const { data } = await nango.put<UpdateSupplierResponse>({
        // https://pennylane.readme.io/reference/suppliers-id-put
        endpoint: `/api/external/v1/suppliers/${source_id}`,
        data: postData,
        retries: 10
    });

    return {
        success: true,
        source_id: data.supplier.source_id
    };
}
