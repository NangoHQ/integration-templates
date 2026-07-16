import { z } from 'zod';
import { createAction } from 'nango';
import crypto from 'crypto';

const AcceptedPaymentMethodsSchema = z.object({
    card: z.boolean(),
    square_gift_card: z.boolean(),
    bank_account: z.boolean(),
    buy_now_pay_later: z.boolean(),
    cash_app_pay: z.boolean()
});

const InputSchema = z.object({
    order_id: z.string().describe('Order ID. Example: "jb5xcmK9WdiTRRDdRetjAmJpxjJZY"'),
    location_id: z.string().describe('Location ID. Example: "L6KAXMZ50WFKS"'),
    customer_id: z.string().describe('Customer ID. Example: "QCA4Q0NF3AA3KDQP390Y6VZ7QM"'),
    due_date: z.string().describe('Payment due date in YYYY-MM-DD format. Example: "2030-01-24"'),
    title: z.string().optional().describe('Invoice title.'),
    description: z.string().optional().describe('Invoice description.'),
    accepted_payment_methods: AcceptedPaymentMethodsSchema.describe('Accepted payment methods for the invoice.')
});

const MoneySchema = z.object({
    amount: z.number(),
    currency: z.string()
});

const PaymentRequestSchema = z.object({
    uid: z.string().optional(),
    request_type: z.string(),
    due_date: z.string().optional(),
    tipping_enabled: z.boolean().optional(),
    automatic_payment_source: z.string().optional(),
    computed_amount_money: MoneySchema.optional(),
    total_completed_amount_money: MoneySchema.optional()
});

const PrimaryRecipientSchema = z.object({
    customer_id: z.string(),
    given_name: z.string().optional(),
    family_name: z.string().optional(),
    email_address: z.string().optional(),
    phone_number: z.string().optional()
});

const ProviderInvoiceSchema = z.object({
    id: z.string(),
    version: z.number(),
    location_id: z.string(),
    order_id: z.string(),
    payment_requests: z.array(PaymentRequestSchema).optional(),
    invoice_number: z.string().optional(),
    title: z.string().optional(),
    description: z.string().optional(),
    scheduled_at: z.string().optional(),
    status: z.string(),
    timezone: z.string().optional(),
    created_at: z.string(),
    updated_at: z.string(),
    primary_recipient: PrimaryRecipientSchema.optional(),
    accepted_payment_methods: AcceptedPaymentMethodsSchema.optional(),
    delivery_method: z.string().optional(),
    sale_or_service_date: z.string().optional(),
    store_payment_method_enabled: z.boolean().optional()
});

const ProviderResponseSchema = z.object({
    invoice: ProviderInvoiceSchema.optional(),
    errors: z
        .array(
            z.object({
                code: z.string(),
                category: z.string(),
                detail: z.string().optional(),
                field: z.string().optional()
            })
        )
        .optional()
});

const OutputSchema = z.object({
    id: z.string(),
    version: z.number(),
    location_id: z.string(),
    order_id: z.string(),
    status: z.string(),
    created_at: z.string(),
    updated_at: z.string(),
    primary_recipient: PrimaryRecipientSchema.optional(),
    accepted_payment_methods: AcceptedPaymentMethodsSchema.optional(),
    payment_requests: z.array(PaymentRequestSchema).optional(),
    invoice_number: z.string().optional(),
    title: z.string().optional(),
    description: z.string().optional(),
    delivery_method: z.string().optional()
});

const action = createAction({
    description: 'Create an invoice.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['INVOICES_WRITE'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const invoiceData: Record<string, unknown> = {
            order_id: input.order_id,
            location_id: input.location_id,
            primary_recipient: {
                customer_id: input.customer_id
            },
            delivery_method: 'EMAIL',
            payment_requests: [
                {
                    request_type: 'BALANCE',
                    due_date: input.due_date,
                    automatic_payment_source: 'NONE'
                }
            ],
            accepted_payment_methods: input.accepted_payment_methods
        };

        if (input.title !== undefined) {
            invoiceData['title'] = input.title;
        }

        if (input.description !== undefined) {
            invoiceData['description'] = input.description;
        }

        const idempotencyKey = crypto.createHash('sha256').update(JSON.stringify(input)).digest('hex');

        const requestBody = {
            idempotency_key: idempotencyKey,
            invoice: invoiceData
        };

        // https://developer.squareup.com/reference/square/invoices-api/create-invoice
        const response = await nango.post({
            endpoint: '/v2/invoices',
            data: requestBody,
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        if (providerResponse.errors && providerResponse.errors.length > 0) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: providerResponse.errors.map((e) => e.detail || e.code).join(', '),
                errors: providerResponse.errors
            });
        }

        if (!providerResponse.invoice) {
            throw new nango.ActionError({
                type: 'missing_invoice',
                message: 'Invoice not returned in the provider response.'
            });
        }

        const invoice = providerResponse.invoice;

        return {
            id: invoice.id,
            version: invoice.version,
            location_id: invoice.location_id,
            order_id: invoice.order_id,
            status: invoice.status,
            created_at: invoice.created_at,
            updated_at: invoice.updated_at,
            ...(invoice.primary_recipient && { primary_recipient: invoice.primary_recipient }),
            ...(invoice.accepted_payment_methods && { accepted_payment_methods: invoice.accepted_payment_methods }),
            ...(invoice.payment_requests && { payment_requests: invoice.payment_requests }),
            ...(invoice.invoice_number !== undefined && { invoice_number: invoice.invoice_number }),
            ...(invoice.title !== undefined && { title: invoice.title }),
            ...(invoice.description !== undefined && { description: invoice.description }),
            ...(invoice.delivery_method !== undefined && { delivery_method: invoice.delivery_method })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
