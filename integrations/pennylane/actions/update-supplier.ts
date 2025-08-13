import { createAction } from 'nango';
import type { UpdateSupplierResponse } from '../models.js';
import { UpdateSupplier, PennylaneSuccessResponse } from '../models.js';

const action = createAction({
    description: 'Action to update a supplier in pennylane',
    version: '2.0.0',

    endpoint: {
        method: 'PATCH',
        path: '/suppliers',
        group: 'Suppliers'
    },

    input: UpdateSupplier,
    output: PennylaneSuccessResponse,

    exec: async (nango, input): Promise<PennylaneSuccessResponse> => {
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
            retries: 3
        });

        return {
            success: true,
            source_id: data.supplier.source_id
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
