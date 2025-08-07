import { z } from 'zod';

const TransactionsReferenceSchema = z
    .object({
        banking_provider: z.string().min(1, 'banking_provider is required'),
        provider_field_name: z.string().min(1, 'provider_field_name is required')
    })
    .optional();

const ImputationDatesSchema = z
    .object({
        start_date: z.string().min(1, 'start_date is required'),
        end_date: z.string().min(1, 'end_date is required')
    })
    .optional();

const LineItemWithTaxSchema = z.object({
    label: z.string().min(1, 'label is a required field'),
    quantity: z.number(),
    section_rank: z.number().optional(),
    currency_amount: z.number(),
    plan_item_number: z.string().optional(),
    unit: z.string().min(1, 'unit is a required field'),
    vat_rate: z.string().min(1, 'vat_rate is a required field'),
    description: z.string().optional(),
    discount: z.number().optional()
});

const LineItemWithoutTaxSchema = z.object({
    label: z.string().min(1, 'label is a required field'),
    quantity: z.number(),
    section_rank: z.number().optional(),
    currency_amount_before_tax: z.number(),
    plan_item_number: z.string().optional(),
    unit: z.string().min(1, 'unit is a required field'),
    vat_rate: z.string().min(1, 'vat_rate is a required field'),
    description: z.string().optional(),
    discount: z.number().optional()
});

const LineItemWithExistingProductSchema = z.object({
    label: z.string().optional(),
    quantity: z.number(),
    discount: z.number().optional(),
    section_rank: z.number().optional(),
    plan_item_number: z.string().optional(),
    product: z.object({
        source_id: z.string().min(1, 'source_id is a required field'),
        price: z.number().optional(),
        vat_rate: z.string().optional(),
        unit: z.string().optional()
    })
});

const LineItemSchema = z.union([LineItemWithTaxSchema, LineItemWithoutTaxSchema, LineItemWithExistingProductSchema]);

export const validateInvoiceInputSchema = z.object({
    date: z.string().min(1, 'date is a required field'),
    deadline: z.string().min(1, 'deadline is a required field'),
    customer_source_id: z.string().min(1, 'customer_source_id is a required field'),
    transactions_reference: TransactionsReferenceSchema,
    imputation_dates: ImputationDatesSchema,
    line_items: z.array(LineItemSchema).nonempty({
        message: 'line_items must have at least one item'
    })
});

export const validateCreateProductSchema = z.object({
    label: z.string().min(1, 'label is a required field'),
    unit: z.string().min(1, 'unit is a required field'),
    price: z.number(),
    vat_rate: z.string().min(1, 'vat_rate is a required field'),
    currency: z.string().min(1, 'currency is a required field'),
    source_id: z.string().min(1, 'source_id is a required field')
});

export const createSupplierSchema = z.object({
    name: z.string().min(1, 'name is a required field'),
    reg_no: z.string().optional(),
    address: z.string().min(1, 'address is a required field'),
    postal_code: z.string().min(1, 'postal_code is a required field'),
    city: z.string().min(1, 'city is a required field'),
    country_alpha2: z.string().min(1, 'country_alpha2 is a required field'),
    recipient: z.string().optional(),
    vat_number: z.string().optional(),
    source_id: z.string().optional(),
    emails: z.array(z.string().email('Each email must be a valid email address')).nonempty('emails must contain at least one email address')
});
