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
