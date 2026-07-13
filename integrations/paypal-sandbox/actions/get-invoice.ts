import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    invoice_id: z.string().describe('PayPal invoice ID. Example: "INV2-CDNR-4VJ3-R9L3-CKGP"')
});

const NameSchema = z
    .object({
        given_name: z.string().optional(),
        surname: z.string().optional()
    })
    .passthrough();

const AddressSchema = z
    .object({
        address_line_1: z.string().optional(),
        admin_area_2: z.string().optional(),
        admin_area_1: z.string().optional(),
        postal_code: z.string().optional(),
        country_code: z.string().optional()
    })
    .passthrough();

const PhoneSchema = z
    .object({
        country_code: z.string().optional(),
        national_number: z.string().optional(),
        phone_type: z.string().optional()
    })
    .passthrough();

const MoneySchema = z
    .object({
        currency_code: z.string().optional(),
        value: z.string().optional()
    })
    .passthrough();

const PaymentTermSchema = z
    .object({
        term_type: z.string().optional(),
        due_date: z.string().optional()
    })
    .passthrough();

const InvoiceMetadataSchema = z
    .object({
        create_time: z.string().optional(),
        created_by_flow: z.string().optional(),
        recipient_view_url: z.string().optional(),
        invoicer_view_url: z.string().optional(),
        cancel_time: z.string().optional(),
        template_id: z.string().optional()
    })
    .passthrough();

const DetailSchema = z
    .object({
        invoice_number: z.string().optional(),
        reference: z.string().optional(),
        invoice_date: z.string().optional(),
        currency_code: z.string().optional(),
        note: z.string().optional(),
        term: z.string().optional(),
        memo: z.string().optional(),
        payment_term: PaymentTermSchema.optional(),
        metadata: InvoiceMetadataSchema.optional()
    })
    .passthrough();

const InvoicerSchema = z
    .object({
        email_address: z.string().optional(),
        name: NameSchema.optional(),
        address: AddressSchema.optional(),
        phones: z.array(PhoneSchema).optional(),
        website: z.string().optional(),
        tax_id: z.string().optional(),
        logo_url: z.string().optional(),
        additional_notes: z.string().optional()
    })
    .passthrough();

const BillingInfoSchema = z
    .object({
        name: NameSchema.optional(),
        address: AddressSchema.optional(),
        email_address: z.string().optional(),
        phones: z.array(PhoneSchema).optional(),
        additional_info: z.string().optional()
    })
    .passthrough();

const ShippingInfoSchema = z
    .object({
        name: NameSchema.optional(),
        address: AddressSchema.optional()
    })
    .passthrough();

const RecipientSchema = z
    .object({
        billing_info: BillingInfoSchema.optional(),
        shipping_info: ShippingInfoSchema.optional()
    })
    .passthrough();

const TaxSchema = z
    .object({
        name: z.string().optional(),
        percent: z.string().optional(),
        amount: MoneySchema.optional()
    })
    .passthrough();

const DiscountSchema = z
    .object({
        percent: z.string().optional(),
        amount: MoneySchema.optional()
    })
    .passthrough();

const UnitAmountSchema = z
    .object({
        currency_code: z.string().optional(),
        value: z.string().optional()
    })
    .passthrough();

const ItemSchema = z
    .object({
        name: z.string().optional(),
        description: z.string().optional(),
        quantity: z.string().optional(),
        unit_amount: UnitAmountSchema.optional(),
        tax: TaxSchema.optional(),
        discount: DiscountSchema.optional(),
        unit_of_measure: z.string().optional()
    })
    .passthrough();

const PartialPaymentSchema = z
    .object({
        allow_partial_payment: z.boolean().optional(),
        minimum_amount_due: MoneySchema.optional()
    })
    .passthrough();

const ConfigurationSchema = z
    .object({
        partial_payment: PartialPaymentSchema.optional(),
        allow_tip: z.boolean().optional(),
        tax_calculated_after_discount: z.boolean().optional(),
        tax_inclusive: z.boolean().optional(),
        template_id: z.string().optional()
    })
    .passthrough();

const LinkSchema = z.object({
    href: z.string().optional(),
    rel: z.string().optional(),
    method: z.string().optional()
});

const AmountBreakdownSchema = z
    .object({
        item_total: MoneySchema.optional(),
        shipping: z
            .object({
                amount: MoneySchema.optional(),
                tax: MoneySchema.optional(),
                discount: DiscountSchema.optional()
            })
            .passthrough()
            .optional(),
        handling: MoneySchema.optional(),
        tax_total: MoneySchema.optional(),
        discount: DiscountSchema.optional(),
        custom: z
            .object({
                label: z.string().optional(),
                amount: MoneySchema.optional()
            })
            .passthrough()
            .optional()
    })
    .passthrough();

const AmountSchema = z
    .object({
        currency_code: z.string().optional(),
        value: z.string().optional(),
        breakdown: AmountBreakdownSchema.optional()
    })
    .passthrough();

const ProviderInvoiceSchema = z
    .object({
        id: z.string(),
        status: z.string().optional(),
        detail: DetailSchema.optional(),
        invoicer: InvoicerSchema.optional(),
        primary_recipients: z.array(RecipientSchema).optional(),
        items: z.array(ItemSchema).optional(),
        configuration: ConfigurationSchema.optional(),
        amount: AmountSchema.optional(),
        due_amount: MoneySchema.optional(),
        links: z.array(LinkSchema).optional()
    })
    .passthrough();

const OutputSchema = ProviderInvoiceSchema;

const action = createAction({
    description: 'Retrieve an invoice.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://developer.paypal.com/api/invoicing/v2/#invoices_get
            endpoint: `/v2/invoicing/invoices/${encodeURIComponent(input.invoice_id)}`,
            retries: 3
        });

        if (!response.data || typeof response.data !== 'object') {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Invoice not found',
                invoice_id: input.invoice_id
            });
        }

        const providerInvoice = ProviderInvoiceSchema.parse(response.data);

        return providerInvoice;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
