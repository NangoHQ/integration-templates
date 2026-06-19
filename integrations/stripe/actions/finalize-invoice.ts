import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const InputSchema = z.object({
    invoice_id: z.string().describe('The ID of the draft invoice to finalize. Example: in_1TbSpyEZpD6kXrae3uL2sSEg'),
    auto_advance: z.boolean().optional().describe('Controls whether Stripe performs automatic collection of the invoice.')
});

const ProviderInvoiceSchema = z.object({
    id: z.string(),
    object: z.string(),
    status: z.string(),
    amount_due: z.number(),
    amount_paid: z.number(),
    amount_remaining: z.number(),
    created: z.number(),
    currency: z.string(),
    customer: z.string().nullish(),
    lines: z.object({
        object: z.string(),
        data: z.array(z.record(z.string(), z.unknown())),
        has_more: z.boolean(),
        total_count: z.number(),
        url: z.string()
    }),
    livemode: z.boolean(),
    metadata: z.record(z.string(), z.unknown()),
    number: z.string().nullish(),
    period_end: z.number(),
    period_start: z.number(),
    subtotal: z.number(),
    total: z.number(),
    hosted_invoice_url: z.string().nullish(),
    invoice_pdf: z.string().nullish(),
    payment_intent: z.string().nullish(),
    subscription: z.string().nullish()
});

const OutputSchema = z.object({
    id: z.string(),
    object: z.string(),
    status: z.string(),
    amount_due: z.number(),
    amount_paid: z.number(),
    amount_remaining: z.number(),
    created: z.number(),
    currency: z.string(),
    customer: z.string().optional(),
    lines: z.object({
        object: z.string(),
        data: z.array(z.record(z.string(), z.unknown())),
        has_more: z.boolean(),
        total_count: z.number(),
        url: z.string()
    }),
    livemode: z.boolean(),
    metadata: z.record(z.string(), z.unknown()),
    number: z.string().optional(),
    period_end: z.number(),
    period_start: z.number(),
    subtotal: z.number(),
    total: z.number(),
    hosted_invoice_url: z.string().optional(),
    invoice_pdf: z.string().optional(),
    payment_intent: z.string().optional(),
    subscription: z.string().optional()
});

const action = createAction({
    description: 'Finalize a draft Stripe invoice.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const bodyParts: string[] = [];
        if (input.auto_advance !== undefined) {
            bodyParts.push(`auto_advance=${encodeURIComponent(String(input.auto_advance))}`);
        }
        const data = bodyParts.join('&');

        const config: Omit<ProxyConfiguration, 'method'> = {
            // https://docs.stripe.com/api/invoices/finalize
            endpoint: `/v1/invoices/${encodeURIComponent(input.invoice_id)}/finalize`,
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            data,
            retries: 3
        };

        const response = await nango.post(config);

        if (!response.data || typeof response.data !== 'object') {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Stripe returned an unexpected response when finalizing the invoice.'
            });
        }

        const providerInvoice = ProviderInvoiceSchema.parse(response.data);

        return {
            id: providerInvoice.id,
            object: providerInvoice.object,
            status: providerInvoice.status,
            amount_due: providerInvoice.amount_due,
            amount_paid: providerInvoice.amount_paid,
            amount_remaining: providerInvoice.amount_remaining,
            created: providerInvoice.created,
            currency: providerInvoice.currency,
            ...(providerInvoice.customer != null && { customer: providerInvoice.customer }),
            lines: providerInvoice.lines,
            livemode: providerInvoice.livemode,
            metadata: providerInvoice.metadata,
            ...(providerInvoice.number != null && { number: providerInvoice.number }),
            period_end: providerInvoice.period_end,
            period_start: providerInvoice.period_start,
            subtotal: providerInvoice.subtotal,
            total: providerInvoice.total,
            ...(providerInvoice.hosted_invoice_url != null && { hosted_invoice_url: providerInvoice.hosted_invoice_url }),
            ...(providerInvoice.invoice_pdf != null && { invoice_pdf: providerInvoice.invoice_pdf }),
            ...(providerInvoice.payment_intent != null && { payment_intent: providerInvoice.payment_intent }),
            ...(providerInvoice.subscription != null && { subscription: providerInvoice.subscription })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
