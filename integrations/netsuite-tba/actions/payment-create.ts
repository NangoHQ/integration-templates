import type { NangoAction, NetsuitePaymentCreateInput, NetsuitePaymentCreateOutput } from '../../models';
import type { NS_Payment } from '../types';
import { netsuitePaymentCreateInputSchema } from '../schema.js';

export default async function runAction(nango: NangoAction, input: NetsuitePaymentCreateInput): Promise<NetsuitePaymentCreateOutput> {
    nango.zodValidateInput({ zodSchema: netsuitePaymentCreateInputSchema, input });
    if (input.description) {
        body.memo = input.description;
    }

    const res = await nango.post({
        endpoint: '/customerpayment',
        data: body,
        retries: 10
    });

    // Extract payment ID from response
    const id = res.headers['location']?.split('/').pop();
    if (!id) {
        throw new nango.ActionError({
            message: "Error creating payment: could not parse 'id' from Netsuite API response"
        });
    }

    return { id };
}
