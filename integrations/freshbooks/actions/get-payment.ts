import { z } from 'zod';
import { createAction } from 'nango';

const MetadataSchema = z.object({
    accountId: z.string().describe('FreshBooks account ID. Example: "ZyQ04o"')
});

const InputSchema = z.object({
    paymentId: z.string().describe('Payment ID. Example: "312041"')
});

const ProviderAmountSchema = z.object({
    amount: z.string(),
    code: z.string()
});

const ProviderPaymentSchema = z.object({
    id: z.number(),
    accounting_systemid: z.string(),
    amount: ProviderAmountSchema.optional(),
    bulk_paymentid: z.number().nullable().optional(),
    clientid: z.number(),
    creditid: z.number().nullable().optional(),
    date: z.string(),
    from_credit: z.boolean(),
    gateway: z.string().nullable().optional(),
    invoiceid: z.number(),
    logid: z.number(),
    note: z.string().nullable().optional(),
    orderid: z.number().nullable().optional(),
    overpaymentid: z.number().nullable().optional(),
    send_client_notification: z.boolean().nullable().optional(),
    transactionid: z.number().nullable().optional(),
    type: z.string(),
    updated: z.string(),
    vis_state: z.number()
});

const OutputSchema = ProviderPaymentSchema;

const action = createAction({
    description: 'Retrieve a single payment.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    metadata: MetadataSchema,
    scopes: ['user:payments:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const rawMetadata = await nango.getMetadata();
        const metadata = MetadataSchema.parse(rawMetadata);

        // https://www.freshbooks.com/api/payments
        const response = await nango.get({
            endpoint: `/accounting/account/${encodeURIComponent(metadata.accountId)}/payments/payments/${encodeURIComponent(input.paymentId)}`,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Payment not found.',
                paymentId: input.paymentId
            });
        }

        const wrapper = z
            .object({
                response: z.object({
                    result: z.object({
                        payment: z.unknown()
                    })
                })
            })
            .parse(response.data);

        const payment = ProviderPaymentSchema.parse(wrapper.response.result.payment);

        return payment;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
