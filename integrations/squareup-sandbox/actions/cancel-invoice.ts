import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    invoice_id: z.string().describe('The ID of the invoice to cancel. Example: "inv:0-ChASk2gEm7VXQ1trYJM0HQBzEL4I"'),
    version: z.number().int().describe('The current version of the invoice. Example: 1')
});

const MoneySchema = z.object({
    amount: z.number().optional(),
    currency: z.string().optional()
});

const PaymentRequestSchema = z.object({
    uid: z.string().optional(),
    request_type: z.string().optional(),
    due_date: z.string().optional(),
    tipping_enabled: z.boolean().optional(),
    computed_amount_money: MoneySchema.optional(),
    total_completed_amount_money: MoneySchema.optional(),
    automatic_payment_source: z.string().optional()
});

const RecipientSchema = z.object({
    customer_id: z.string().optional(),
    given_name: z.string().optional(),
    family_name: z.string().optional(),
    email_address: z.string().optional()
});

const AcceptedPaymentMethodsSchema = z.object({
    card: z.boolean().optional(),
    square_gift_card: z.boolean().optional(),
    bank_account: z.boolean().optional(),
    buy_now_pay_later: z.boolean().optional(),
    cash_app_pay: z.boolean().optional()
});

const ProviderInvoiceSchema = z.object({
    id: z.string(),
    version: z.number().int(),
    location_id: z.string().optional(),
    order_id: z.string().optional(),
    payment_requests: z.array(PaymentRequestSchema).optional(),
    primary_recipient: RecipientSchema.optional(),
    invoice_number: z.string().optional(),
    title: z.string().optional(),
    public_url: z.string().optional(),
    status: z.string(),
    timezone: z.string().optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional(),
    accepted_payment_methods: AcceptedPaymentMethodsSchema.optional(),
    delivery_method: z.string().optional(),
    store_payment_method_enabled: z.boolean().optional()
});

const ProviderResponseSchema = z.object({
    invoice: ProviderInvoiceSchema
});

const OutputSchema = z.object({
    id: z.string(),
    version: z.number().int(),
    location_id: z.string().optional(),
    order_id: z.string().optional(),
    status: z.string(),
    invoice_number: z.string().optional(),
    title: z.string().optional(),
    public_url: z.string().optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional(),
    primary_recipient: RecipientSchema.optional(),
    payment_requests: z.array(PaymentRequestSchema).optional(),
    accepted_payment_methods: AcceptedPaymentMethodsSchema.optional(),
    delivery_method: z.string().optional(),
    store_payment_method_enabled: z.boolean().optional()
});

const action = createAction({
    description: 'Cancel a published, unpaid invoice.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['INVOICES_WRITE'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://developer.squareup.com/reference/square/invoices-api/cancel-invoice
            endpoint: `/v2/invoices/${encodeURIComponent(input.invoice_id)}/cancel`,
            data: {
                version: input.version
            },
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);
        const invoice = providerResponse.invoice;

        return {
            id: invoice.id,
            version: invoice.version,
            location_id: invoice.location_id,
            order_id: invoice.order_id,
            status: invoice.status,
            invoice_number: invoice.invoice_number,
            title: invoice.title,
            public_url: invoice.public_url,
            created_at: invoice.created_at,
            updated_at: invoice.updated_at,
            primary_recipient: invoice.primary_recipient,
            payment_requests: invoice.payment_requests,
            accepted_payment_methods: invoice.accepted_payment_methods,
            delivery_method: invoice.delivery_method,
            store_payment_method_enabled: invoice.store_payment_method_enabled
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
