import { z } from 'zod';
import { createAction } from 'nango';
import { randomUUID } from 'crypto';

const InputSchema = z.object({
    capture_id: z.string().describe('The PayPal-generated ID for the captured payment to refund. Example: "7TK53561YB803214S"'),
    amount: z
        .object({
            currency_code: z
                .string()
                .regex(/^[A-Z]{3}$/, 'currency_code must be three uppercase letters.')
                .describe('The three-character ISO-4217 currency code. Example: "USD"'),
            value: z.string().describe('The value, which might be a decimal with two places. Example: "10.99"')
        })
        .optional()
        .describe('The currency and amount for a partial refund. Omit for a full refund.'),
    invoice_id: z.string().optional().describe('The API caller-provided external invoice ID for this order.'),
    custom_id: z.string().optional().describe('The API caller-provided external ID for reconciling transactions.'),
    note_to_payer: z.string().optional().describe("The reason for the refund. Appears in the payer's transaction history and emails."),
    request_id: z
        .string()
        .regex(/^[\x21-\x7E]{1,256}$/, 'request_id must be 1-256 printable ASCII characters.')
        .optional()
        .describe('Optional idempotency key sent as PayPal-Request-Id. If omitted, a random one is generated per execution.')
});

const MoneySchema = z.object({
    currency_code: z.string(),
    value: z.string()
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

const LinkSchema = z.object({
    href: z.string(),
    rel: z.string(),
    method: z.string()
});

const ProviderRefundSchema = z.object({
    id: z.string(),
    status: z.string(),
    amount: MoneySchema.optional(),
    seller_payable_breakdown: SellerPayableBreakdownSchema.optional(),
    invoice_id: z.string().optional(),
    custom_id: z.string().optional(),
    note_to_payer: z.string().optional(),
    create_time: z.string().optional(),
    update_time: z.string().optional(),
    links: z.array(LinkSchema).optional()
});

const OutputSchema = z.object({
    id: z.string(),
    status: z.string(),
    amount: MoneySchema.optional(),
    seller_payable_breakdown: SellerPayableBreakdownSchema.optional(),
    invoice_id: z.string().optional(),
    custom_id: z.string().optional(),
    note_to_payer: z.string().optional(),
    create_time: z.string().optional(),
    update_time: z.string().optional(),
    links: z.array(LinkSchema).optional()
});

const action = createAction({
    description: 'Refund a capture.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['https://uri.paypal.com/services/payments/refund'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const requestBody: {
            amount?: { currency_code: string; value: string };
            invoice_id?: string;
            custom_id?: string;
            note_to_payer?: string;
        } = {};

        if (input.amount !== undefined) {
            requestBody.amount = input.amount;
        }
        if (input.invoice_id !== undefined) {
            requestBody.invoice_id = input.invoice_id;
        }
        if (input.custom_id !== undefined) {
            requestBody.custom_id = input.custom_id;
        }
        if (input.note_to_payer !== undefined) {
            requestBody.note_to_payer = input.note_to_payer;
        }

        // https://developer.paypal.com/docs/api/payments/v2/#captures_refund
        const response = await nango.post({
            endpoint: `/v2/payments/captures/${encodeURIComponent(input.capture_id)}/refund`,
            data: requestBody,
            headers: {
                // One idempotency key per execution so all internal retries resolve to the same refund.
                'PayPal-Request-Id': input.request_id ?? randomUUID()
            },
            retries: 3
        });

        const refund = ProviderRefundSchema.parse(response.data);

        return {
            id: refund.id,
            status: refund.status,
            ...(refund.amount !== undefined && { amount: refund.amount }),
            ...(refund.seller_payable_breakdown !== undefined && { seller_payable_breakdown: refund.seller_payable_breakdown }),
            ...(refund.invoice_id !== undefined && { invoice_id: refund.invoice_id }),
            ...(refund.custom_id !== undefined && { custom_id: refund.custom_id }),
            ...(refund.note_to_payer !== undefined && { note_to_payer: refund.note_to_payer }),
            ...(refund.create_time !== undefined && { create_time: refund.create_time }),
            ...(refund.update_time !== undefined && { update_time: refund.update_time }),
            ...(refund.links !== undefined && { links: refund.links })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
