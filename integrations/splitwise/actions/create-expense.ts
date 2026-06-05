import { z } from 'zod';
import { createAction } from 'nango';

const UserSchema = z.object({
    id: z.number().int(),
    first_name: z.string().optional(),
    last_name: z.string().optional(),
    picture: z
        .object({
            small: z.string().optional(),
            medium: z.string().optional(),
            large: z.string().optional()
        })
        .optional()
});

const ExpenseUserSchema = z.object({
    user_id: z.number().int(),
    paid_share: z.string(),
    owed_share: z.string(),
    net_balance: z.string().optional(),
    user: z
        .object({
            id: z.number().int(),
            first_name: z.string().optional(),
            last_name: z.string().optional(),
            picture: z
                .object({
                    medium: z.string().optional()
                })
                .optional()
        })
        .optional()
});

const RepaymentSchema = z.object({
    from: z.number().int(),
    to: z.number().int(),
    amount: z.string()
});

const CategorySchema = z.object({
    id: z.number().int(),
    name: z.string()
});

const ReceiptSchema = z.object({
    large: z.string().nullable().optional(),
    original: z.string().nullable().optional()
});

const ProviderExpenseSchema = z
    .object({
        id: z.number().int(),
        group_id: z.number().int().nullable().optional(),
        friendship_id: z.number().int().nullable().optional(),
        expense_bundle_id: z.number().int().nullable().optional(),
        description: z.string(),
        repeats: z.boolean().optional(),
        repeat_interval: z.string().nullable().optional(),
        email_reminder: z.boolean().optional(),
        email_reminder_in_advance: z.number().int().nullable().optional(),
        next_repeat: z.string().nullable().optional(),
        details: z.string().nullable().optional(),
        comments_count: z.number().int().optional(),
        payment: z.boolean().optional(),
        transaction_confirmed: z.boolean().optional(),
        cost: z.string(),
        currency_code: z.string(),
        repayments: z.array(RepaymentSchema).optional(),
        date: z.string().optional(),
        created_at: z.string().optional(),
        created_by: UserSchema.nullable().optional(),
        updated_at: z.string().optional(),
        updated_by: UserSchema.nullable().optional(),
        deleted_at: z.string().nullable().optional(),
        deleted_by: UserSchema.nullable().optional(),
        category: CategorySchema.optional(),
        receipt: ReceiptSchema.optional(),
        users: z.array(ExpenseUserSchema).optional()
    })
    .passthrough();

const InputSchema = z.object({
    cost: z.string().describe('Cost of the expense as a string with 2 decimal places. Example: "10.00"'),
    description: z.string().describe('Short description of the expense'),
    group_id: z.number().int().describe('Group ID, or 0 for non-group expenses'),
    currency_code: z.string().optional().describe('Currency code, e.g. "USD"'),
    category_id: z.number().int().optional().describe('Category ID from get_categories'),
    date: z.string().optional().describe('Date of the expense in ISO 8601 format. Example: "2026-06-05T13:00:00Z"'),
    details: z.string().nullable().optional().describe('Notes for the expense'),
    split_equally: z.boolean().optional().describe('If true, split equally among group members (requires group_id)'),
    users: z
        .array(
            z.object({
                user_id: z.number().int().describe('User ID'),
                paid_share: z.string().describe('Amount paid by this user, e.g. "10.00"'),
                owed_share: z.string().describe('Amount owed by this user, e.g. "5.00"'),
                first_name: z.string().optional(),
                last_name: z.string().optional(),
                email: z.string().optional()
            })
        )
        .optional()
        .describe('List of users with shares (required unless split_equally is true)')
});

const OutputSchema = ProviderExpenseSchema;

const action = createAction({
    description: 'Create a expense in Splitwise.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/create-expense',
        group: 'Expenses'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        if (input.split_equally !== true && (!input.users || input.users.length === 0)) {
            throw new nango.ActionError({
                type: 'invalid_input',
                message: 'users array is required when split_equally is not true'
            });
        }

        const data: Record<string, unknown> = {
            cost: input.cost,
            description: input.description,
            group_id: input.group_id
        };

        if (input.currency_code !== undefined) {
            data['currency_code'] = input.currency_code;
        }
        if (input.category_id !== undefined) {
            data['category_id'] = input.category_id;
        }
        if (input.date !== undefined) {
            data['date'] = input.date;
        }
        if (input.details !== undefined) {
            data['details'] = input.details;
        }

        if (input.split_equally === true) {
            data['split_equally'] = true;
        } else if (input.users && input.users.length > 0) {
            let i = 0;
            for (const user of input.users) {
                const prefix = `users__${i}__`;
                data[`${prefix}user_id`] = user.user_id;
                data[`${prefix}paid_share`] = user.paid_share;
                data[`${prefix}owed_share`] = user.owed_share;
                if (user.first_name !== undefined) {
                    data[`${prefix}first_name`] = user.first_name;
                }
                if (user.last_name !== undefined) {
                    data[`${prefix}last_name`] = user.last_name;
                }
                if (user.email !== undefined) {
                    data[`${prefix}email`] = user.email;
                }
                i++;
            }
        }

        // https://dev.splitwise.com/#tag/expenses/paths/~1create_expense/post
        const response = await nango.post({
            endpoint: '/api/v3.0/create_expense',
            data,
            retries: 10
        });

        const parsed = z
            .object({
                expenses: z.array(ProviderExpenseSchema),
                errors: z.record(z.string(), z.array(z.string())).optional()
            })
            .parse(response.data);

        if (parsed.errors && Object.keys(parsed.errors).length > 0) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: 'Splitwise returned errors when creating the expense',
                errors: parsed.errors
            });
        }

        const expense = parsed.expenses[0];
        if (!expense) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'No expense returned after creation'
            });
        }

        return expense;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
