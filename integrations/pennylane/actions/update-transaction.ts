import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.number().describe('Transaction ID. Example: 42'),
    customer_id: z.number().nullable().optional().describe('The ID of the customer to associate with the transaction.'),
    supplier_id: z.number().nullable().optional().describe('The ID of the supplier to associate with the transaction.')
});

const ProviderTransactionSchema = z.object({
    id: z.number(),
    label: z.string().nullable(),
    attachment_required: z.boolean(),
    date: z.string(),
    outstanding_balance: z.string().nullable(),
    created_at: z.string(),
    updated_at: z.string(),
    archived_at: z.string().nullable(),
    currency: z.string().nullable(),
    currency_amount: z.string(),
    amount: z.string(),
    currency_fee: z.string().nullable(),
    fee: z.string().nullable(),
    journal: z.object({
        id: z.number(),
        url: z.string()
    }),
    bank_account: z.object({
        id: z.number(),
        url: z.string()
    }),
    pro_account_expense: z
        .object({
            employee: z
                .object({
                    id: z.number(),
                    first_name: z.string(),
                    last_name: z.string()
                })
                .nullable(),
            card_masked_number: z.string()
        })
        .nullable(),
    customer: z
        .object({
            id: z.number(),
            url: z.string()
        })
        .nullable(),
    supplier: z
        .object({
            id: z.number(),
            url: z.string()
        })
        .nullable(),
    categories: z.array(
        z.object({
            id: z.number(),
            label: z.string(),
            weight: z.string(),
            category_group: z.object({
                id: z.number()
            }),
            analytical_code: z.string().nullable(),
            created_at: z.string(),
            updated_at: z.string()
        })
    ),
    matched_invoices: z.object({
        url: z.string()
    }),
    interbank_code: z.string().nullable()
});

const OutputSchema = z.object({
    id: z.number(),
    label: z.string().optional(),
    attachment_required: z.boolean(),
    date: z.string(),
    outstanding_balance: z.string().optional(),
    created_at: z.string(),
    updated_at: z.string(),
    archived_at: z.string().optional(),
    currency: z.string().optional(),
    currency_amount: z.string(),
    amount: z.string(),
    currency_fee: z.string().optional(),
    fee: z.string().optional(),
    journal: z.object({
        id: z.number(),
        url: z.string()
    }),
    bank_account: z.object({
        id: z.number(),
        url: z.string()
    }),
    pro_account_expense: z
        .object({
            employee: z
                .object({
                    id: z.number(),
                    first_name: z.string(),
                    last_name: z.string()
                })
                .optional(),
            card_masked_number: z.string()
        })
        .optional(),
    customer: z
        .object({
            id: z.number(),
            url: z.string()
        })
        .optional(),
    supplier: z
        .object({
            id: z.number(),
            url: z.string()
        })
        .optional(),
    categories: z.array(
        z.object({
            id: z.number(),
            label: z.string(),
            weight: z.string(),
            category_group: z.object({
                id: z.number()
            }),
            analytical_code: z.string().optional(),
            created_at: z.string(),
            updated_at: z.string()
        })
    ),
    matched_invoices: z.object({
        url: z.string()
    }),
    interbank_code: z.string().optional()
});

const action = createAction({
    description: 'Update a bank transaction',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['transactions:all'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const hasCustomerId = input.customer_id !== undefined;
        const hasSupplierId = input.supplier_id !== undefined;

        if (!hasCustomerId && !hasSupplierId) {
            throw new nango.ActionError({
                type: 'invalid_input',
                message: 'Exactly one of customer_id or supplier_id must be provided.'
            });
        }

        if (hasCustomerId && hasSupplierId) {
            throw new nango.ActionError({
                type: 'invalid_input',
                message: 'Only one of customer_id or supplier_id may be provided, not both.'
            });
        }

        const data = hasCustomerId ? { customer_id: input.customer_id } : { supplier_id: input.supplier_id };

        const response = await nango.put({
            // https://pennylane.readme.io/reference/updatetransaction
            endpoint: `/api/external/v2/transactions/${encodeURIComponent(input.id)}`,
            data,
            retries: 3
        });

        if (!response.data || typeof response.data !== 'object') {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Provider returned an empty or invalid response.'
            });
        }

        const transaction = ProviderTransactionSchema.parse(response.data);

        return {
            id: transaction.id,
            ...(transaction.label != null && { label: transaction.label }),
            attachment_required: transaction.attachment_required,
            date: transaction.date,
            ...(transaction.outstanding_balance != null && { outstanding_balance: transaction.outstanding_balance }),
            created_at: transaction.created_at,
            updated_at: transaction.updated_at,
            ...(transaction.archived_at != null && { archived_at: transaction.archived_at }),
            ...(transaction.currency != null && { currency: transaction.currency }),
            currency_amount: transaction.currency_amount,
            amount: transaction.amount,
            ...(transaction.currency_fee != null && { currency_fee: transaction.currency_fee }),
            ...(transaction.fee != null && { fee: transaction.fee }),
            journal: transaction.journal,
            bank_account: transaction.bank_account,
            ...(transaction.pro_account_expense != null && {
                pro_account_expense: {
                    ...(transaction.pro_account_expense.employee != null && {
                        employee: transaction.pro_account_expense.employee
                    }),
                    card_masked_number: transaction.pro_account_expense.card_masked_number
                }
            }),
            ...(transaction.customer != null && { customer: transaction.customer }),
            ...(transaction.supplier != null && { supplier: transaction.supplier }),
            categories: transaction.categories.map((category) => ({
                id: category.id,
                label: category.label,
                weight: category.weight,
                category_group: category.category_group,
                ...(category.analytical_code != null && { analytical_code: category.analytical_code }),
                created_at: category.created_at,
                updated_at: category.updated_at
            })),
            matched_invoices: transaction.matched_invoices,
            ...(transaction.interbank_code != null && { interbank_code: transaction.interbank_code })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
