import { createAction } from "nango";
import type { NS_Invoice } from '../types.js';
import { netsuiteInvoiceCreateInputSchema } from '../schema.js';

import { NetsuiteInvoiceCreateOutput, NetsuiteInvoiceCreateInput } from "../models.js";

const action = createAction({
    description: "Creates an invoice in Netsuite",
    version: "3.0.0",

    endpoint: {
        method: "POST",
        path: "/invoices",
        group: "Invoices"
    },

    input: NetsuiteInvoiceCreateInput,
    output: NetsuiteInvoiceCreateOutput,

    exec: async (nango, input): Promise<NetsuiteInvoiceCreateOutput> => {
        await nango.zodValidateInput({ zodSchema: netsuiteInvoiceCreateInputSchema, input });

        const body: Partial<NS_Invoice> = {
            entity: { id: input.customerId },
            status: { id: input.status },
            item: {
                items: input.lines.map((line) => ({
                    item: { id: line.itemId, refName: line.description || '' },
                    quantity: line.quantity,
                    amount: line.amount,
                    ...(line.vatCode && { taxDetailsReference: line.vatCode }),
                    location: { id: line.locationId!, refName: '' }
                }))
            }
        };
        if (input.currency) {
            body.currency = { refName: input.currency };
        }
        if (input.description) {
            body.memo = input.description;
        }
        const res = await nango.post({
            endpoint: '/invoice',
            data: body,
            retries: 3
        });
        const id = res.headers['location']?.split('/').pop();
        if (!id) {
            throw new nango.ActionError({
                message: "Error creating invoice: could not parse 'id' from Netsuite API response"
            });
        }
        return { id };
    }
});

export type NangoActionLocal = Parameters<typeof action["exec"]>[0];
export default action;
