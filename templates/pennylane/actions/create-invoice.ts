import { createAction } from "nango";
import { mapInvoice } from '../mappers/to-create-invoice.js';
import { validateInvoiceInputSchema } from '../schema.js';

import type { ProxyConfiguration } from "nango";
import type { InvoiceResponse } from "../models.js";
import { PennylaneSuccessResponse, CreateInvoice } from "../models.js";

const action = createAction({
    description: "Action to create an invoice in pennylane",
    version: "2.0.0",

    endpoint: {
        method: "POST",
        path: "/invoices",
        group: "Invoices"
    },

    input: CreateInvoice,
    output: PennylaneSuccessResponse,

    exec: async (nango, input): Promise<PennylaneSuccessResponse> => {
        await nango.zodValidateInput({ zodSchema: validateInvoiceInputSchema, input });

        if (input.language && !['fr_FR, en_GB'].includes(input.language)) {
            input = { ...input, language: 'en_GB' };
        }

        const config: ProxyConfiguration = {
            // https://pennylane.readme.io/reference/customer_invoices-post-1
            endpoint: '/api/external/v1/customer_invoices',
            data: mapInvoice(input),
            retries: 3
        };

        const { data } = await nango.post<InvoiceResponse>(config);
        return {
            success: true,
            source_id: data.invoice.id
        };
    }
});

export type NangoActionLocal = Parameters<typeof action["exec"]>[0];
export default action;
