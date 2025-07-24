import { createAction } from "nango";
import type { UpdateInvoiceResponse } from "../models.js";
import { UpdateInvoice, PennylaneSuccessResponse } from "../models.js";

const action = createAction({
    description: "Action to update an invoice in pennylane",
    version: "1.0.1",

    endpoint: {
        method: "PATCH",
        path: "/invoices",
        group: "Invoices"
    },

    input: UpdateInvoice,
    output: PennylaneSuccessResponse,

    exec: async (nango, input): Promise<PennylaneSuccessResponse> => {
        if (!input.id) {
            throw new nango.ActionError({
                message: 'id (invoice source_id) is a required field'
            });
        }

        type invoiceUpdate = Omit<UpdateInvoice, 'id'>;
        const { id, ...rest } = input;
        const invoiceData: invoiceUpdate = { ...rest };

        const postData = {
            invoice: {
                ...invoiceData
            }
        };

        const { data } = await nango.put<UpdateInvoiceResponse>({
            // https://pennylane.readme.io/reference/putexternalapiv1customerinvoices-1
            endpoint: `/api/external/v1/customer_invoices/${id}`,
            data: postData,
            retries: 3
        });

        return {
            success: true,
            source_id: data.invoice.id
        };
    }
});

export type NangoActionLocal = Parameters<typeof action["exec"]>[0];
export default action;
