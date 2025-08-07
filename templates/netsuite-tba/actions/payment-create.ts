import { createAction } from "nango";
import type { NS_Payment } from '../types.js';
import { netsuitePaymentCreateInputSchema } from '../schema.js';

import { NetsuitePaymentCreateOutput, NetsuitePaymentCreateInput } from "../models.js";

const action = createAction({
    description: "Creates a payment in Netsuite",
    version: "2.0.0",

    endpoint: {
        method: "POST",
        path: "/payments",
        group: "Payments"
    },

    input: NetsuitePaymentCreateInput,
    output: NetsuitePaymentCreateOutput,

    exec: async (nango, input): Promise<NetsuitePaymentCreateOutput> => {
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
});

export type NangoActionLocal = Parameters<typeof action["exec"]>[0];
export default action;
