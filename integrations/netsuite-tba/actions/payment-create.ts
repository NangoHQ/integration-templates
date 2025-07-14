import type { NangoAction, NetsuitePaymentCreateInput, NetsuitePaymentCreateOutput } from '../../models.js';
import type { NS_Payment } from '../types.js';
import { netsuitePaymentCreateInputSchema } from '../schema.js';

export default async function runAction(nango: NangoAction, input: NetsuitePaymentCreateInput): Promise<NetsuitePaymentCreateOutput> {
    await nango.zodValidateInput({ zodSchema: netsuitePaymentCreateInputSchema, input });

    const body: Partial<NS_Payment> = {
        customer: { id: input.customerId },
        payment: input.amount,
        currency: { id: input.currency },
        tranId: input.paymentReference,
        status: { id: input.status },
        apply: { items: input.applyTo.map((id) => ({ doc: { id } })) }
    };
    if (input.description) {
        body.memo = input.description;
    }

    const res = await nango.post({
        endpoint: '/customerpayment',
        data: body,
        retries: 3
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
