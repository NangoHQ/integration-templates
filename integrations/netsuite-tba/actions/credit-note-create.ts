import type { NangoAction, NetsuiteCreditNoteCreateInput, NetsuiteCreditNoteCreateOutput } from '../../models';
import type { NS_CreditNote } from '../types';
import { netsuiteCreditNoteCreateInputSchema } from '../schema.js';

export default async function runAction(nango: NangoAction, input: NetsuiteCreditNoteCreateInput): Promise<NetsuiteCreditNoteCreateOutput> {
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
