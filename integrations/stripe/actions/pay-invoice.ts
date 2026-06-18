import { z } from 'zod';
import { createAction } from 'nango';
import { URLSearchParams } from 'url';

const InputSchema = z.object({
    invoice_id: z.string().describe('The ID of the invoice to pay. Example: "in_xxx"'),
    paid_out_of_band: z.boolean().optional().describe('Mark the invoice as paid without a real payment method. Useful in test mode.'),
    forgive: z.boolean().optional().describe('Forgive the invoice if the payment fails.'),
    payment_method: z.string().optional().describe('A payment method to charge. Example: "pm_xxx".'),
    source: z.string().optional().describe('A payment source to charge. Deprecated by Stripe.')
});

const ProviderInvoiceSchema = z
    .object({
        id: z.string(),
        amount_due: z.number(),
        amount_paid: z.number(),
        amount_remaining: z.number(),
        attempted: z.boolean(),
        created: z.number(),
        currency: z.string(),
        customer: z.string().nullable().optional(),
        description: z.string().nullable().optional(),
        hosted_invoice_url: z.string().nullable().optional(),
        invoice_pdf: z.string().nullable().optional(),
        livemode: z.boolean(),
        metadata: z.record(z.string(), z.string()).nullable().optional(),
        number: z.string().nullable().optional(),
        paid: z.boolean().optional(),
        payment_intent: z.string().nullable().optional(),
        status: z.string().nullable().optional(),
        subscription: z.string().nullable().optional(),
        total: z.number().nullable().optional()
    })
    .passthrough();

const OutputSchema = z.object({
    id: z.string(),
    amount_due: z.number(),
    amount_paid: z.number(),
    amount_remaining: z.number(),
    attempted: z.boolean(),
    created_at: z.number(),
    currency: z.string(),
    customer_id: z.string().optional(),
    description: z.string().optional(),
    hosted_invoice_url: z.string().optional(),
    invoice_pdf: z.string().optional(),
    livemode: z.boolean(),
    metadata: z.record(z.string(), z.string()).optional(),
    number: z.string().optional(),
    paid: z.boolean().optional(),
    payment_intent_id: z.string().optional(),
    status: z.string().optional(),
    subscription_id: z.string().optional(),
    total: z.number().optional()
});

const action = createAction({
    description: 'Pay a Stripe invoice.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const body = new URLSearchParams();
        if (input.paid_out_of_band !== undefined) {
            body.append('paid_out_of_band', String(input.paid_out_of_band));
        }
        if (input.forgive !== undefined) {
            body.append('forgive', String(input.forgive));
        }
        if (input.payment_method !== undefined) {
            body.append('payment_method', input.payment_method);
        }
        if (input.source !== undefined) {
            body.append('source', input.source);
        }

        const response = await nango.post({
            // https://docs.stripe.com/api/invoices/pay
            endpoint: `/v1/invoices/${encodeURIComponent(input.invoice_id)}/pay`,
            data: body.toString(),
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            retries: 1
        });

        const invoice = ProviderInvoiceSchema.parse(response.data);

        return {
            id: invoice.id,
            amount_due: invoice.amount_due,
            amount_paid: invoice.amount_paid,
            amount_remaining: invoice.amount_remaining,
            attempted: invoice.attempted,
            created_at: invoice.created,
            currency: invoice.currency,
            ...(invoice.customer != null && { customer_id: invoice.customer }),
            ...(invoice.description != null && { description: invoice.description }),
            ...(invoice.hosted_invoice_url != null && { hosted_invoice_url: invoice.hosted_invoice_url }),
            ...(invoice.invoice_pdf != null && { invoice_pdf: invoice.invoice_pdf }),
            livemode: invoice.livemode,
            ...(invoice.metadata != null && { metadata: invoice.metadata }),
            ...(invoice.number != null && { number: invoice.number }),
            ...(invoice.paid !== undefined && { paid: invoice.paid }),
            ...(invoice.payment_intent != null && { payment_intent_id: invoice.payment_intent }),
            ...(invoice.status != null && { status: invoice.status }),
            ...(invoice.subscription != null && { subscription_id: invoice.subscription }),
            ...(invoice.total != null && { total: invoice.total })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
