import { z } from 'zod';

const TransactionsReferenceSchema = z
    .object({
        banking_provider: z.string({
            required_error: 'banking_provider is required'
        }),
        provider_field_name: z.string({
            required_error: 'provider_field_name is required'
        })
    })
    .optional();

const ImputationDatesSchema = z
    .object({
        start_date: z.string({
            required_error: 'start_date is required'
        }),
        end_date: z.string({
            required_error: 'end_date is required'
        })
    })
    .optional();

const LineItemWithTaxSchema = z.object({
    label: z.string({
        required_error: 'label is a required field'
    }),
    quantity: z.number({
        required_error: 'quantity is a required field'
    }),
    section_rank: z.number().optional(),
    currency_amount: z.number({
        required_error: 'currency_amount is a required field'
    }),
    plan_item_number: z.string().optional(),
    unit: z.string({
        required_error: 'unit is a required field'
    }),
    vat_rate: z.string({
        required_error: 'vat_rate is a required field'
    }),
    description: z.string().optional(),
    discount: z.number().optional()
});

const LineItemWithoutTaxSchema = z.object({
    label: z.string({
        required_error: 'label is a required field'
    }),
    quantity: z.number({
        required_error: 'quantity is a required field'
    }),
    section_rank: z.number().optional(),
    currency_amount_before_tax: z.number({
        required_error: 'currency_amount_before_tax is a required field'
    }),
    plan_item_number: z.string().optional(),
    unit: z.string({
        required_error: 'unit is a required field'
    }),
    vat_rate: z.string({
        required_error: 'vat_rate is a required field'
    }),
    description: z.string().optional(),
    discount: z.number().optional()
});

const LineItemWithExistingProductSchema = z.object({
    label: z.string().optional(),
    quantity: z.number({
        required_error: 'quantity is a required field'
    }),
    discount: z.number().optional(),
    section_rank: z.number().optional(),
    plan_item_number: z.string().optional(),
    product: z.object({
        source_id: z.string({
            required_error: 'source_id is a required field'
        }),
        price: z.number().optional(),
        vat_rate: z.string().optional(),
        unit: z.string().optional()
    })
});

const LineItemSchema = z.union([LineItemWithTaxSchema, LineItemWithoutTaxSchema, LineItemWithExistingProductSchema]);

export const validateInvoiceInputSchema = z.object({
    date: z.string({
        required_error: 'date is a required field'
    }),
    deadline: z.string({
        required_error: 'deadline is a required field'
    }),
    customer_source_id: z.string({
        required_error: 'customer_source_id is a required field'
    }),
    transactions_reference: TransactionsReferenceSchema,
    imputation_dates: ImputationDatesSchema,
    line_items: z.array(LineItemSchema).nonempty({
        message: 'line_items must have at least one item'
    })
});

export const validateCreateProductSchema = z.object({
    label: z.string({
        required_error: 'label is a required field'
    }),
    unit: z.string({
        required_error: 'unit is a required field'
    }),
    price: z.number({
        required_error: 'price is a required field'
    }),
    vat_rate: z.string({
        required_error: 'vat_rate is a required field'
    }),
    currency: z.string({
        required_error: 'currency is a required field'
    }),
    source_id: z.string({
        required_error: 'source_id is a required field'
    })
});

export const createSupplierSchema = z.object({
    name: z.string({
        required_error: 'name is a required field'
    }),
    reg_no: z.string().optional(),
    address: z.string({
        required_error: 'address is a required field'
    }),
    postal_code: z.string({
        required_error: 'postal_code is a required field'
    }),
    city: z.string({
        required_error: 'city is a required field'
    }),
    country_alpha2: z.string({
        required_error: 'country_alpha2 is a required field'
    }),
    recipient: z.string().optional(),
    vat_number: z.string().optional(),
    source_id: z.string().optional(),
    emails: z
        .array(
            z.string().email({
                message: 'Each email must be a valid email address'
            })
        )
        .nonempty({
            message: 'emails must contain at least one email address'
        }),
    iban: z.string().optional(),
    payment_conditions: z.string().optional(),
    phone: z.string().optional(),
    reference: z.string().optional(),
    notes: z.string().optional()
});
