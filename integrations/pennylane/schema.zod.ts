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
    imputation_dates: ImputationDatesSchema
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
