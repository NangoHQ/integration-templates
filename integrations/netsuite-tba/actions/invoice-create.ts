import type { NangoAction, NetsuiteInvoiceCreateInput, NetsuiteInvoiceCreateOutput } from '../../models';
import type { NS_Invoice } from '../types';
import { netsuiteInvoiceCreateInputSchema } from '../schema.js';

export default async function runAction(nango: NangoAction, input: NetsuiteInvoiceCreateInput): Promise<NetsuiteInvoiceCreateOutput> {
    nango.zodValidate({ zodSchema: netsuiteInvoiceCreateInputSchema, input });
    if (input.currency) {
        body.currency = { refName: input.currency };
    }
    if (input.description) {
        body.memo = input.description;
    }
    const res = await nango.post({
        endpoint: '/invoice',
        data: body,
        retries: 10
    });
    const id = res.headers['location']?.split('/').pop();
    if (!id) {
        throw new nango.ActionError({
            message: "Error creating invoice: could not parse 'id' from Netsuite API response"
        });
    }
    return { id };
}
