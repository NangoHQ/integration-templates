import { z } from 'zod';
import { createAction } from 'nango';

const MoneySchema = z.object({
    currency_code: z.string(),
    value: z.string()
});

const NameSchema = z.object({
    given_name: z.string().optional(),
    surname: z.string().optional()
});

const AddressSchema = z.object({
    address_line_1: z.string().optional(),
    address_line_2: z.string().optional(),
    admin_area_2: z.string().optional(),
    admin_area_1: z.string().optional(),
    postal_code: z.string().optional(),
    country_code: z.string().optional()
});

const PhoneSchema = z.object({
    country_code: z.string(),
    national_number: z.string(),
    phone_type: z.string().optional()
});

const BillingInfoSchema = z.object({
    name: NameSchema.optional(),
    address: AddressSchema.optional(),
    email_address: z.string().optional(),
    phones: z.array(PhoneSchema).optional(),
    additional_info_value: z.string().optional()
});

const ShippingInfoSchema = z.object({
    name: NameSchema.optional(),
    address: AddressSchema.optional()
});

const RecipientSchema = z.object({
    billing_info: BillingInfoSchema.optional(),
    shipping_info: ShippingInfoSchema.optional()
});

const TaxSchema = z.object({
    name: z.string().optional(),
    percent: z.string().optional(),
    amount: MoneySchema.optional(),
    tax_note: z.string().optional()
});

const DiscountSchema = z.object({
    percent: z.string().optional(),
    amount: MoneySchema.optional()
});

const InvoiceItemSchema = z.object({
    name: z.string(),
    description: z.string().optional(),
    quantity: z.string(),
    unit_amount: MoneySchema,
    tax: TaxSchema.optional(),
    discount: DiscountSchema.optional(),
    unit_of_measure: z.string().optional()
});

const PaymentTermSchema = z.object({
    term_type: z.string().optional(),
    due_date: z.string().optional()
});

const InvoiceDetailSchema = z.object({
    invoice_number: z.string().optional(),
    invoice_date: z.string().optional(),
    currency_code: z.string(),
    note: z.string().optional(),
    term: z.string().optional(),
    memo: z.string().optional(),
    payment_term: PaymentTermSchema.optional(),
    order_details: z.string().optional(),
    project_details: z.string().optional()
});

const InvoicerSchema = z.object({
    name: NameSchema.optional(),
    address: AddressSchema.optional(),
    email_address: z.string().optional(),
    phones: z.array(PhoneSchema).optional(),
    website: z.string().optional(),
    logo_url: z.string().optional(),
    tax_id: z.string().optional(),
    additional_notes: z.string().optional()
});

const PartialPaymentSchema = z.object({
    allow_partial_payment: z.boolean().optional(),
    minimum_amount_due: MoneySchema.optional()
});

const ConfigurationSchema = z.object({
    partial_payment: PartialPaymentSchema.optional(),
    allow_tip: z.boolean().optional(),
    tax_calculated_after_discount: z.boolean().optional(),
    tax_inclusive: z.boolean().optional(),
    template_id: z.string().optional()
});

const LinkSchema = z.object({
    href: z.string(),
    rel: z.string(),
    method: z.string()
});

const InputSchema = z.object({
    detail: InvoiceDetailSchema,
    invoicer: InvoicerSchema.optional(),
    primary_recipients: z.array(RecipientSchema).optional(),
    additional_recipients: z.array(z.string()).optional(),
    items: z.array(InvoiceItemSchema),
    configuration: ConfigurationSchema.optional()
});

const ProviderMetadataSchema = z.object({
    create_time: z.string().optional(),
    recipient_view_url: z.string().optional(),
    invoicer_view_url: z.string().optional()
});

const ProviderInvoiceDetailSchema = z.object({
    invoice_number: z.string().optional(),
    invoice_date: z.string().optional(),
    currency_code: z.string().optional(),
    note: z.string().optional(),
    term: z.string().optional(),
    memo: z.string().optional(),
    payment_term: PaymentTermSchema.optional(),
    metadata: ProviderMetadataSchema.optional()
});

const ProviderInvoicerSchema = z.object({
    email_address: z.string().optional()
});

const ProviderAmountSchema = z.object({
    currency_code: z.string().optional(),
    value: z.string().optional()
});

const ProviderResponseSchema = z.object({
    id: z.string(),
    status: z.string(),
    detail: ProviderInvoiceDetailSchema.optional(),
    invoicer: ProviderInvoicerSchema.optional(),
    primary_recipients: z.array(RecipientSchema).optional(),
    items: z.array(InvoiceItemSchema).optional(),
    amount: ProviderAmountSchema.optional(),
    due_amount: MoneySchema.optional(),
    links: z.array(LinkSchema).optional()
});

const OutputSchema = z.object({
    id: z.string(),
    status: z.string(),
    detail: ProviderInvoiceDetailSchema.optional(),
    invoicer: ProviderInvoicerSchema.optional(),
    primary_recipients: z.array(RecipientSchema).optional(),
    items: z.array(InvoiceItemSchema).optional(),
    amount: ProviderAmountSchema.optional(),
    due_amount: MoneySchema.optional(),
    links: z.array(LinkSchema).optional()
});

const action = createAction({
    description: 'Create an invoice.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['https://uri.paypal.com/services/invoicing/invoices/readwrite'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://developer.paypal.com/api/invoicing/v2/#invoices_create
            endpoint: '/v2/invoicing/invoices',
            headers: {
                Prefer: 'return=representation'
            },
            data: {
                detail: input.detail,
                ...(input.invoicer !== undefined && { invoicer: input.invoicer }),
                ...(input.primary_recipients !== undefined && { primary_recipients: input.primary_recipients }),
                ...(input.additional_recipients !== undefined && { additional_recipients: input.additional_recipients }),
                items: input.items,
                ...(input.configuration !== undefined && { configuration: input.configuration })
            },
            retries: 1
        });

        const providerInvoice = ProviderResponseSchema.parse(response.data);

        return {
            id: providerInvoice.id,
            status: providerInvoice.status,
            ...(providerInvoice.detail !== undefined && { detail: providerInvoice.detail }),
            ...(providerInvoice.invoicer !== undefined && { invoicer: providerInvoice.invoicer }),
            ...(providerInvoice.primary_recipients !== undefined && { primary_recipients: providerInvoice.primary_recipients }),
            ...(providerInvoice.items !== undefined && { items: providerInvoice.items }),
            ...(providerInvoice.amount !== undefined && { amount: providerInvoice.amount }),
            ...(providerInvoice.due_amount !== undefined && { due_amount: providerInvoice.due_amount }),
            ...(providerInvoice.links !== undefined && { links: providerInvoice.links })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
