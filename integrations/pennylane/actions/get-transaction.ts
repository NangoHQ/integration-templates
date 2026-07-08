import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.number().int().describe('Transaction ID. Example: 42')
});

const ProviderTransactionSchema = z.object({
    id: z.number().int(),
    label: z.string().nullable(),
    attachment_required: z.boolean(),
    date: z.string(),
    outstanding_balance: z.string().nullable(),
    created_at: z.string(),
    updated_at: z.string(),
    archived_at: z.string().nullable(),
    currency: z.union([z.string(), z.null()]),
    currency_amount: z.string(),
    amount: z.string(),
    currency_fee: z.string().nullable(),
    fee: z.string().nullable(),
    journal: z.object({
        id: z.number().int(),
        url: z.string()
    }),
    bank_account: z.object({
        id: z.number().int(),
        url: z.string()
    }),
    pro_account_expense: z
        .object({
            employee: z
                .object({
                    id: z.number().int(),
                    first_name: z.string(),
                    last_name: z.string()
                })
                .nullable(),
            card_masked_number: z.string()
        })
        .nullable(),
    customer: z
        .object({
            id: z.number().int(),
            url: z.string()
        })
        .nullable(),
    supplier: z
        .object({
            id: z.number().int(),
            url: z.string()
        })
        .nullable(),
    categories: z.array(
        z.object({
            id: z.number().int(),
            label: z.string(),
            weight: z.string(),
            category_group: z.object({
                id: z.number().int()
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
    id: z.number().int(),
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
        id: z.number().int(),
        url: z.string()
    }),
    bank_account: z.object({
        id: z.number().int(),
        url: z.string()
    }),
    pro_account_expense: z
        .object({
            employee: z
                .object({
                    id: z.number().int(),
                    first_name: z.string(),
                    last_name: z.string()
                })
                .optional(),
            card_masked_number: z.string()
        })
        .optional(),
    customer: z
        .object({
            id: z.number().int(),
            url: z.string()
        })
        .optional(),
    supplier: z
        .object({
            id: z.number().int(),
            url: z.string()
        })
        .optional(),
    categories: z.array(
        z.object({
            id: z.number().int(),
            label: z.string(),
            weight: z.string(),
            category_group: z.object({
                id: z.number().int()
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
    description: 'Retrieve a bank transaction.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['transactions:readonly'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://pennylane.readme.io/reference/gettransaction
        const response = await nango.get({
            endpoint: `/api/external/v2/transactions/${encodeURIComponent(input.id)}`,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Transaction not found',
                id: input.id
            });
        }

        const providerTransaction = ProviderTransactionSchema.parse(response.data);

        return {
            id: providerTransaction.id,
            label: providerTransaction.label ?? undefined,
            attachment_required: providerTransaction.attachment_required,
            date: providerTransaction.date,
            outstanding_balance: providerTransaction.outstanding_balance ?? undefined,
            created_at: providerTransaction.created_at,
            updated_at: providerTransaction.updated_at,
            archived_at: providerTransaction.archived_at ?? undefined,
            currency: providerTransaction.currency ?? undefined,
            currency_amount: providerTransaction.currency_amount,
            amount: providerTransaction.amount,
            currency_fee: providerTransaction.currency_fee ?? undefined,
            fee: providerTransaction.fee ?? undefined,
            journal: providerTransaction.journal,
            bank_account: providerTransaction.bank_account,
            pro_account_expense:
                providerTransaction.pro_account_expense != null
                    ? {
                          employee: providerTransaction.pro_account_expense.employee ?? undefined,
                          card_masked_number: providerTransaction.pro_account_expense.card_masked_number
                      }
                    : undefined,
            customer: providerTransaction.customer ?? undefined,
            supplier: providerTransaction.supplier ?? undefined,
            categories: providerTransaction.categories.map((category) => ({
                id: category.id,
                label: category.label,
                weight: category.weight,
                category_group: category.category_group,
                analytical_code: category.analytical_code ?? undefined,
                created_at: category.created_at,
                updated_at: category.updated_at
            })),
            matched_invoices: providerTransaction.matched_invoices,
            interbank_code: providerTransaction.interbank_code ?? undefined
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
