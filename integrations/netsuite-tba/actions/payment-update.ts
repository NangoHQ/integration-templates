import { createAction } from 'nango';
import type { NS_Payment } from '../types.js';
import { netsuitePaymentUpdateInputSchema } from '../schema.js';

import { NetsuitePaymentUpdateOutput, NetsuitePaymentUpdateInput } from '../models.js';

const action = createAction({
    description: 'Updates a payment in Netsuite',
    version: '2.0.0',

    endpoint: {
        method: 'PUT',
        path: '/payments',
        group: 'Payments'
    },

    input: NetsuitePaymentUpdateInput,
    output: NetsuitePaymentUpdateOutput,

    exec: async (nango, input): Promise<NetsuitePaymentUpdateOutput> => {
        await nango.zodValidateInput({ zodSchema: netsuitePaymentUpdateInputSchema, input });

        const body: Partial<NS_Payment> = {
            id: input.id
        };
        if (input.customerId) {
            body.customer = { id: input.customerId };
        }
        if (input.amount) {
            body.payment = input.amount;
        }
        if (input.currency) {
            body.currency = { refName: input.currency };
        }
        if (input.paymentReference) {
            body.tranId = input.paymentReference;
        }
        if (input.status) {
            body.status = { id: input.status };
        }
        if (input.applyTo) {
            body.apply = { items: input.applyTo.map((id) => ({ doc: { id } })) };
        }
        if (input.description) {
            body.memo = input.description;
        }

        await nango.patch({
            endpoint: '/customerpayment',
            data: body,
            retries: 3
        });

        return { success: true };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
