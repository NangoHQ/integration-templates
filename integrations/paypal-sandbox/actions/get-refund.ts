import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    refund_id: z.string().describe('The PayPal-generated ID for the refund. Example: "1JU08902781691411"')
});

const MoneySchema = z.object({
    currency_code: z.string(),
    value: z.string()
});

const LinkSchema = z.object({
    href: z.string(),
    rel: z.string(),
    method: z.string()
});

const PlatformFeeSchema = z.object({
    amount: MoneySchema,
    payee: z
        .object({
            email_address: z.string().optional(),
            merchant_id: z.string().optional()
        })
        .optional()
});

const SellerPayableBreakdownSchema = z.object({
    gross_amount: MoneySchema.optional(),
    paypal_fee: MoneySchema.optional(),
    platform_fees: z.array(PlatformFeeSchema).optional(),
    net_amount: MoneySchema.optional(),
    total_refunded_amount: MoneySchema.optional()
});

const ProviderRefundSchema = z
    .object({
        id: z.string(),
        amount: MoneySchema.optional(),
        status: z.string().optional(),
        note: z.string().optional(),
        seller_payable_breakdown: SellerPayableBreakdownSchema.optional(),
        invoice_id: z.string().optional(),
        custom_id: z.string().optional(),
        create_time: z.string().optional(),
        update_time: z.string().optional(),
        links: z.array(LinkSchema).optional()
    })
    .passthrough();

const OutputSchema = ProviderRefundSchema;

const action = createAction({
    description: 'Retrieve details for a refund.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // @allowTryCatch We catch 404s from PayPal and convert them to a typed ActionError so callers get a clean not_found response instead of a raw HTTP exception.
        try {
            const response = await nango.get({
                // https://developer.paypal.com/api/payments/v2/#refunds_get
                endpoint: `/v2/payments/refunds/${encodeURIComponent(input.refund_id)}`,
                retries: 3
            });

            const refund = ProviderRefundSchema.parse(response.data);

            return refund;
        } catch (err: unknown) {
            const status =
                err !== null &&
                typeof err === 'object' &&
                'response' in err &&
                err.response !== null &&
                typeof err.response === 'object' &&
                'status' in err.response &&
                typeof err.response.status === 'number'
                    ? err.response.status
                    : undefined;

            if (status === 404) {
                throw new nango.ActionError({
                    type: 'not_found',
                    message: 'Refund not found',
                    refund_id: input.refund_id
                });
            }

            throw err;
        }
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
