import type { NangoAction, NetsuiteCreditNoteUpdateInput, NetsuiteCreditNoteUpdateOutput } from '../../models';
import type { NS_CreditNote, NS_Item } from '../types';
import { netsuiteCreditNoteUpdateInputSchema } from '../schema.js';

export default async function runAction(nango: NangoAction, input: NetsuiteCreditNoteUpdateInput): Promise<NetsuiteCreditNoteUpdateOutput> {
    nango.zodValidate({ zodSchema: netsuiteCreditNoteUpdateInputSchema, input });
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
        retries: 10
    });
    return { success: true };
}
