import { createAction } from "nango";
import { validateCreateProductSchema } from '../schema.js';

import { PennylaneSuccessResponse, CreateProduct } from "../models.js";

const action = createAction({
    description: "Action to create a product in pennylane",
    version: "1.0.1",

    endpoint: {
        method: "POST",
        path: "/products",
        group: "Products"
    },

    input: CreateProduct,
    output: PennylaneSuccessResponse,

    exec: async (nango, input): Promise<PennylaneSuccessResponse> => {
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
});

export type NangoActionLocal = Parameters<typeof action["exec"]>[0];
export default action;
