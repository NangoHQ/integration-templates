import { z } from 'zod';
import { createAction } from 'nango';

const MetadataSchema = z.object({
    accountId: z.string().describe('FreshBooks account ID. Example: "ZyQ04o"')
});

const InputSchema = z.object({
    invoiceid: z.number().describe('Invoice ID to apply the payment to. Example: 453877'),
    amount: z.object({
        amount: z.string().describe('Payment amount. Example: "100.00"'),
        code: z.string().describe('Currency code. Example: "USD"')
    }),
    date: z.string().describe('Payment date in YYYY-MM-DD format. Example: "2024-01-15"'),
    type: z
        .enum([
            'Cash',
            'Check',
            'Credit',
            'VISA',
            'MC',
            'AMEX',
            'Discover',
            'Interac',
            'Diners',
            'JCB',
            'PayPal',
            'Stripe',
            'Square',
            'Eway',
            'TwoCheckout',
            'ACH',
            'NoCharge',
            'Other'
        ])
        .describe('Payment type. Example: "Cash"')
});

const ProviderPaymentSchema = z.object({
    id: z.number(),
    invoiceid: z.number().optional(),
    amount: z
        .object({
            amount: z.string().optional(),
            code: z.string().optional()
        })
        .optional(),
    date: z.string().optional(),
    type: z.string().optional(),
    clientid: z.number().optional(),
    vis_state: z.number().optional(),
    updated: z.string().optional(),
    note: z.string().optional().nullable()
});

const OutputSchema = z.object({
    id: z.number(),
    invoiceid: z.number().optional(),
    amount: z
        .object({
            amount: z.string().optional(),
            code: z.string().optional()
        })
        .optional(),
    date: z.string().optional(),
    type: z.string().optional(),
    clientid: z.number().optional(),
    vis_state: z.number().optional(),
    updated: z.string().optional(),
    note: z.string().optional()
});

const action = createAction({
    description: 'Create a payment against an invoice.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    metadata: MetadataSchema,
    scopes: ['user:payments:write'],

    exec: async (nango, input) => {
        const metadata = await nango.getMetadata();
        const parsedMetadata = MetadataSchema.safeParse(metadata);

        if (!parsedMetadata.success) {
            throw new nango.ActionError({
                type: 'invalid_metadata',
                message: 'accountId is required in metadata.'
            });
        }

        const accountId = parsedMetadata.data.accountId;

        // https://www.freshbooks.com/api/payments
        const response = await nango.post({
            endpoint: `/accounting/account/${encodeURIComponent(accountId)}/payments/payments`,
            data: {
                payment: {
                    invoiceid: input.invoiceid,
                    amount: input.amount,
                    date: input.date,
                    type: input.type
                }
            },
            retries: 3
        });

        const wrapper = z
            .object({
                response: z.object({
                    result: z.object({
                        payment: z.unknown()
                    })
                })
            })
            .safeParse(response.data);

        if (!wrapper.success) {
            throw new nango.ActionError({
                type: 'unexpected_response',
                message: 'Unexpected response format from FreshBooks API.'
            });
        }

        const paymentResult = ProviderPaymentSchema.safeParse(wrapper.data.response.result.payment);

        if (!paymentResult.success) {
            throw new nango.ActionError({
                type: 'unexpected_response',
                message: 'Payment data did not match expected schema.'
            });
        }

        const payment = paymentResult.data;

        return {
            id: payment.id,
            ...(payment.invoiceid !== undefined && { invoiceid: payment.invoiceid }),
            ...(payment.amount !== undefined && { amount: payment.amount }),
            ...(payment.date !== undefined && { date: payment.date }),
            ...(payment.type !== undefined && { type: payment.type }),
            ...(payment.clientid !== undefined && { clientid: payment.clientid }),
            ...(payment.vis_state !== undefined && { vis_state: payment.vis_state }),
            ...(payment.updated !== undefined && { updated: payment.updated }),
            ...(payment.note != null && { note: payment.note })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
