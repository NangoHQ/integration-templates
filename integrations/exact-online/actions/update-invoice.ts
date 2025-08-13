import { createAction } from 'nango';
import type { E0_SalesInvoice, ResponsePostBody } from '../types.js';
import { getUser } from '../helpers/get-user.js';
import { exactInvoiceUpdateInputSchema } from '../schema.zod.js';

import { ExactInvoiceUpdateOutput, ExactInvoiceUpdateInput } from '../models.js';

const action = createAction({
    description: 'Updates an invoice in ExactOnline',
    version: '2.0.0',

    endpoint: {
        method: 'PUT',
        path: '/invoices',
        group: 'Invoices'
    },

    input: ExactInvoiceUpdateInput,
    output: ExactInvoiceUpdateOutput,

    exec: async (nango, input): Promise<ExactInvoiceUpdateOutput> => {
        await nango.zodValidateInput({ zodSchema: exactInvoiceUpdateInputSchema, input });

        const { division } = await getUser(nango);

        const body: Partial<E0_SalesInvoice> = {};
        if (input.deliverTo) {
            body.OrderedBy = input.deliverTo;
        }
        if (input.createdAt) {
            body.OrderDate = input.createdAt.toISOString();
        }
        if (input.description) {
            body.Description = input.description;
        }
        if (input.currency) {
            body.Currency = input.currency;
        }

        await nango.put<ResponsePostBody<E0_SalesInvoice>>({
            endpoint: `/api/v1/${division}/salesinvoice/SalesInvoices(guid'${input.id}')`,
            data: body,
            retries: 3
        });

        return {
            success: true
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
