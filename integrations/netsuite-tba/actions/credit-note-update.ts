import { createAction } from "nango";
import type { NS_CreditNote, NS_Item } from '../types.js';
import { netsuiteCreditNoteUpdateInputSchema } from '../schema.js';

import { NetsuiteCreditNoteUpdateOutput, NetsuiteCreditNoteUpdateInput } from "../models.js";

const action = createAction({
    description: "Updates a credit note in Netsuite",
    version: "2.0.0",

    endpoint: {
        method: "PUT",
        path: "/credit-notes",
        group: "Credit Notes"
    },

    input: NetsuiteCreditNoteUpdateInput,
    output: NetsuiteCreditNoteUpdateOutput,

    exec: async (nango, input): Promise<NetsuiteCreditNoteUpdateOutput> => {
        await nango.zodValidateInput({ zodSchema: netsuiteCreditNoteUpdateInputSchema, input });

        const lines = input.lines?.map((line) => {
            const item: NS_Item = {
                item: { id: line.itemId, refName: line.description || '' },
                quantity: line.quantity,
                amount: line.amount
            };
            if (line.vatCode) {
                item.taxDetailsReference = line.vatCode;
            }
            return item;
        });

        const body: Partial<NS_CreditNote> = {
            id: input.id
        };
        if (input.customerId) {
            body.entity = { id: input.customerId };
        }
        if (input.status) {
            body.status = { id: input.status };
        }
        if (input.currency) {
            body.currency = { refName: input.currency };
        }
        if (input.description) {
            body.memo = input.description;
        }
        if (lines) {
            body.item = { items: lines };
        }
        await nango.patch({
            endpoint: '/creditmemo',
            data: body,
            retries: 3
        });
        return { success: true };
    }
});

export type NangoActionLocal = Parameters<typeof action["exec"]>[0];
export default action;
