import { createAction } from "nango";
import { UpdatePennylaneCustomer, PennylaneSuccessResponse, PennylaneIndividualCustomer } from "../models.js";

const action = createAction({
    description: "Action to update a supplier in pennylane",
    version: "1.0.1",

    endpoint: {
        method: "PATCH",
        path: "/customers",
        group: "Customers"
    },

    input: UpdatePennylaneCustomer,
    output: PennylaneSuccessResponse,

    exec: async (nango, input): Promise<PennylaneSuccessResponse> => {
        if (!input.id) {
            throw new nango.ActionError({
                message: 'id (customer source_id) is a required field'
            });
        }

        type updateData = Omit<UpdatePennylaneCustomer, 'id'>;
        const filtered: updateData = { ...input };

        const postData = {
            customer: {
                ...filtered
            }
        };

        const { data } = await nango.put<{ customer: Partial<PennylaneIndividualCustomer> }>({
            // https://pennylane.readme.io/reference/customers-id-put-1
            endpoint: `/api/external/v1/customers/${input.id}`,
            data: postData,
            retries: 3
        });

        return {
            success: true,
            source_id: data.customer.source_id!
        };
    }
});

export type NangoActionLocal = Parameters<typeof action["exec"]>[0];
export default action;
