import { createAction } from "nango";
import type { ResponsePostBody, E0_SalesInvoice, EO_SalesInvoiceLine } from '../types.js';
import { getUser } from '../helpers/get-user.js';
import { exactInvoiceCreateInputSchema } from '../schema.zod.js';

import { ExactInvoiceCreateOutput, ExactInvoiceCreateInput } from "../models.js";

const action = createAction({
    description: "Creates an invoice in ExactOnline",
    version: "2.0.0",

    endpoint: {
        method: "POST",
        path: "/invoices",
        group: "Invoices"
    },

    input: ExactInvoiceCreateInput,
    output: ExactInvoiceCreateOutput,

    exec: async (nango, input): Promise<ExactInvoiceCreateOutput> => {
        await nango.zodValidateInput({ zodSchema: exactInvoiceCreateInputSchema, input });

        const { division } = await getUser(nango);

        const body: Omit<Partial<E0_SalesInvoice>, 'SalesInvoiceLines'> & {
            SalesInvoiceLines: Partial<EO_SalesInvoiceLine>[];
        } = {
            OrderedBy: input.customerId,
            Journal: input.journal || 70, // https://support.exactonline.com/community/s/knowledge-base#All-All-DNO-Content-business-example-api-sales-invoice
            Currency: input.currency || 'EUR',
            Description: input.description || '',
            OrderDate: input.createdAt ? input.createdAt.toISOString() : new Date().toISOString(),
            SalesInvoiceLines: input.lines.map((line) => {
                return {
                    Item: line.itemId,
                    Quantity: line.quantity,
                    NetPrice: line.amountNet,
                    VATCode: line.vatCode || '',
                    Description: line.description || ''
                };
            })
        };

        const create = await nango.post<ResponsePostBody<E0_SalesInvoice>>({
            endpoint: `/api/v1/${division}/salesinvoice/SalesInvoices`,
            data: body,
            retries: 3
        });

        return {
            id: create.data.d.InvoiceID
        };
    }
});

export type NangoActionLocal = Parameters<typeof action["exec"]>[0];
export default action;
