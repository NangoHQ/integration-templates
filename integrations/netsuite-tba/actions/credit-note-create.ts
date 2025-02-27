import type { NangoAction, NetsuiteCreditNoteCreateInput, NetsuiteCreditNoteCreateOutput } from '../../models';
import type { NS_CreditNote } from '../types';
import { netsuiteCreditNoteCreateInputSchema } from '../schema.js';

export default async function runAction(nango: NangoAction, input: NetsuiteCreditNoteCreateInput): Promise<NetsuiteCreditNoteCreateOutput> {
    nango.zodValidate({ zodSchema: netsuiteCreditNoteCreateInputSchema, input });
    if (input.currency) {
        body.currency = { refName: input.currency };
    }
    if (input.description) {
        body.memo = input.description;
    }
    const res = await nango.post({
        endpoint: '/creditmemo',
        data: body,
        retries: 10
    });
    const id = res.headers['location']?.split('/').pop();
    if (!id) {
        throw new nango.ActionError({
            message: "Error creating credit note: could not parse 'id' from Netsuite API response"
        });
    }
    return { id };
}
