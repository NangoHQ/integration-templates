import { createAction } from "nango";
import type { NS_CreditNote } from '../types.js';
import { netsuiteCreditNoteCreateInputSchema } from '../schema.js';

import { NetsuiteCreditNoteCreateOutput, NetsuiteCreditNoteCreateInput } from "../models.js";

const action = createAction({
    description: "Creates a credit note in Netsuite",
    version: "1.0.1",

    endpoint: {
        method: "POST",
        path: "/credit-notes",
        group: "Credit Notes"
    },

    input: NetsuiteCreditNoteCreateInput,
    output: NetsuiteCreditNoteCreateOutput,

    exec: async (nango, input): Promise<NetsuiteCreditNoteCreateOutput> => {
        await nango.zodValidateInput({ zodSchema: netsuiteCreditNoteCreateInputSchema, input });

        const body: Partial<NS_CreditNote> = {
            entity: { id: input.customerId },
            status: { id: input.status },
            item: {
                items: input.lines.map((line) => ({
                    item: { id: line.itemId, refName: line.description || '' },
                    quantity: line.quantity,
                    amount: line.amount,
                    ...(line.vatCode && { taxDetailsReference: line.vatCode })
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
            endpoint: '/creditmemo',
            data: body,
            retries: 3
        });
        const id = res.headers['location']?.split('/').pop();
        if (!id) {
            throw new nango.ActionError({
                message: "Error creating credit note: could not parse 'id' from Netsuite API response"
            });
        }
        return { id };
    }
});

export type NangoActionLocal = Parameters<typeof action["exec"]>[0];
export default action;
