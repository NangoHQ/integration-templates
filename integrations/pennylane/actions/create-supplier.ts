import { createAction } from 'nango';
import { createSupplierSchema } from '../schema.js';

import { PennylaneSuccessResponse, CreateSupplier } from '../models.js';

const action = createAction({
    description: 'Action to create a supplier in pennylane',
    version: '2.0.0',

    endpoint: {
        method: 'POST',
        path: '/suppliers',
        group: 'Suppliers'
    },

    input: CreateSupplier,
    output: PennylaneSuccessResponse,

    exec: async (nango, input): Promise<PennylaneSuccessResponse> => {
        await nango.zodValidateInput({ zodSchema: createSupplierSchema, input });

        const postData = {
            supplier: {
                ...input
            }
        };

        const { data } = await nango.post({
            // https://pennylane.readme.io/reference/suppliers-post
            endpoint: `/api/external/v1/suppliers`,
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
