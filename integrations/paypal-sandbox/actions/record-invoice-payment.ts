import { z } from 'zod';
import { createAction } from 'nango';
import { randomUUID } from 'crypto';

const InputSchema = z.object({
    invoice_id: z.string().describe('The ID of the invoice to record payment against. Example: "INV2-CDNR-4VJ3-R9L3-CKGP"'),
    method: z.enum(['BANK_TRANSFER', 'CASH', 'CHECK', 'CREDIT_CARD', 'DEBIT_CARD', 'PAYPAL', 'WIRE_TRANSFER', 'OTHER']).describe('The payment method.'),
    amount: z
        .object({
            currency_code: z.string().regex(/^[A-Z]{3}$/, 'currency_code must be three uppercase letters.'),
            value: z.string()
        })
        .optional()
        .describe('The payment amount.'),
    payment_date: z.string().optional().describe('The payment date in YYYY-MM-DD format.'),
    note: z.string().optional().describe('A note about the payment.'),
    request_id: z
        .string()
        .regex(/^[\x21-\x7E]{1,256}$/, 'request_id must be 1-256 printable ASCII characters.')
        .optional()
        .describe('Optional idempotency key sent as PayPal-Request-Id. If omitted, a random one is generated per execution.')
});

const ProviderResponseSchema = z.object({
    payment_id: z.string()
});

const OutputSchema = z.object({
    payment_id: z.string().describe('The PayPal-generated ID for the recorded payment.')
});

const action = createAction({
    description: 'Record an external (offline) payment against an invoice, e.g. cash or bank transfer.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['https://uri.paypal.com/services/invoicing'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://developer.paypal.com/docs/api/invoicing/v2/#invoices_payments
            endpoint: `/v2/invoicing/invoices/${encodeURIComponent(input.invoice_id)}/payments`,
            data: {
                method: input.method,
                ...(input.amount !== undefined && {
                    amount: {
                        currency_code: input.amount.currency_code,
                        value: input.amount.value
                    }
                }),
                ...(input.payment_date !== undefined && { payment_date: input.payment_date }),
                ...(input.note !== undefined && { note: input.note })
            },
            headers: {
                // One idempotency key per execution so all internal retries resolve to the same recorded payment.
                'PayPal-Request-Id': input.request_id ?? randomUUID()
            },
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        return {
            payment_id: providerResponse.payment_id
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
