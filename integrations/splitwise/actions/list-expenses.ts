import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor (offset) from the previous response. Omit for the first page.'),
    limit: z.number().optional().describe('Number of expenses to return. Defaults to 20.'),
    group_id: z.number().optional().describe('If provided, only expenses in that group will be returned.'),
    friend_id: z.number().optional().describe('ID of another user. If provided, only expenses between the current and provided user will be returned.'),
    dated_after: z.string().optional().describe('ISO 8601 datetime. Return expenses later than this date.'),
    dated_before: z.string().optional().describe('ISO 8601 datetime. Return expenses earlier than this date.'),
    updated_after: z.string().optional().describe('Return expenses updated after this date.'),
    updated_before: z.string().optional().describe('Return expenses updated before this date.')
});

const ProviderUserSchema = z.object({
    id: z.number(),
    first_name: z.string().optional(),
    last_name: z.string().nullable().optional(),
    email: z.string().optional(),
    picture: z
        .object({
            small: z.string().optional(),
            medium: z.string().optional(),
            large: z.string().optional()
        })
        .optional()
});

const UserSchema = z.object({
    id: z.number(),
    first_name: z.string().optional(),
    last_name: z.string().optional(),
    email: z.string().optional(),
    picture: z
        .object({
            small: z.string().optional(),
            medium: z.string().optional(),
            large: z.string().optional()
        })
        .optional()
});

const RepaymentSchema = z.object({
    from: z.number().optional(),
    to: z.number().optional(),
    amount: z.string().optional()
});

const CategorySchema = z.object({
    id: z.number().optional(),
    name: z.string().optional()
});

const ProviderShareUserSchema = z.object({
    id: z.number().optional(),
    first_name: z.string().optional(),
    last_name: z.string().optional(),
    picture: z
        .object({
            medium: z.string().optional()
        })
        .optional()
});

const ProviderShareSchema = z.object({
    user: ProviderShareUserSchema.nullable().optional(),
    user_id: z.number().optional(),
    paid_share: z.string().optional(),
    owed_share: z.string().optional(),
    net_balance: z.string().optional()
});

const ShareUserSchema = z.object({
    id: z.number().optional(),
    first_name: z.string().optional(),
    last_name: z.string().optional(),
    picture: z
        .object({
            medium: z.string().optional()
        })
        .optional()
});

const ShareSchema = z.object({
    user: ShareUserSchema.optional(),
    user_id: z.number().optional(),
    paid_share: z.string().optional(),
    owed_share: z.string().optional(),
    net_balance: z.string().optional()
});

const ProviderReceiptSchema = z.object({
    large: z.string().nullable().optional(),
    original: z.string().nullable().optional()
});

const ReceiptSchema = z.object({
    large: z.string().optional(),
    original: z.string().optional()
});

const ProviderExpenseSchema = z
    .object({
        id: z.number(),
        group_id: z.number().nullable().optional(),
        friendship_id: z.number().nullable().optional(),
        description: z.string().optional(),
        repeats: z.boolean().optional(),
        repeat_interval: z.string().nullable().optional(),
        details: z.string().nullable().optional(),
        comments_count: z.number().optional(),
        payment: z.boolean().optional(),
        transaction_confirmed: z.boolean().optional(),
        cost: z.string().optional(),
        currency_code: z.string().optional(),
        repayments: z.array(RepaymentSchema).optional(),
        date: z.string().optional(),
        created_at: z.string().optional(),
        created_by: ProviderUserSchema.nullable().optional(),
        updated_at: z.string().optional(),
        updated_by: ProviderUserSchema.nullable().optional(),
        deleted_at: z.string().nullable().optional(),
        deleted_by: ProviderUserSchema.nullable().optional(),
        category: CategorySchema.optional(),
        receipt: ProviderReceiptSchema.optional(),
        users: z.array(ProviderShareSchema).optional()
    })
    .passthrough();

const ExpenseSchema = z.object({
    id: z.number(),
    group_id: z.number().optional(),
    friendship_id: z.number().optional(),
    description: z.string().optional(),
    repeats: z.boolean().optional(),
    repeat_interval: z.string().optional(),
    details: z.string().optional(),
    comments_count: z.number().optional(),
    payment: z.boolean().optional(),
    transaction_confirmed: z.boolean().optional(),
    cost: z.string().optional(),
    currency_code: z.string().optional(),
    repayments: z.array(RepaymentSchema).optional(),
    date: z.string().optional(),
    created_at: z.string().optional(),
    created_by: UserSchema.optional(),
    updated_at: z.string().optional(),
    updated_by: UserSchema.optional(),
    deleted_at: z.string().optional(),
    deleted_by: UserSchema.optional(),
    category: CategorySchema.optional(),
    receipt: ReceiptSchema.optional(),
    users: z.array(ShareSchema).optional()
});

const OutputSchema = z.object({
    expenses: z.array(ExpenseSchema),
    next_cursor: z.string().optional()
});

function mapUser(user: z.infer<typeof ProviderUserSchema> | null | undefined): z.infer<typeof UserSchema> | undefined {
    if (!user) {
        return undefined;
    }
    return {
        id: user.id,
        ...(user.first_name !== undefined && { first_name: user.first_name }),
        ...(user.last_name != null && { last_name: user.last_name }),
        ...(user.email !== undefined && { email: user.email }),
        ...(user.picture !== undefined && {
            picture: {
                ...(user.picture.small !== undefined && { small: user.picture.small }),
                ...(user.picture.medium !== undefined && { medium: user.picture.medium }),
                ...(user.picture.large !== undefined && { large: user.picture.large })
            }
        })
    };
}

function mapShare(share: z.infer<typeof ProviderShareSchema>): z.infer<typeof ShareSchema> {
    return {
        ...(share.user_id !== undefined && { user_id: share.user_id }),
        ...(share.paid_share !== undefined && { paid_share: share.paid_share }),
        ...(share.owed_share !== undefined && { owed_share: share.owed_share }),
        ...(share.net_balance !== undefined && { net_balance: share.net_balance }),
        ...(share.user != null && {
            user: {
                ...(share.user.id !== undefined && { id: share.user.id }),
                ...(share.user.first_name !== undefined && { first_name: share.user.first_name }),
                ...(share.user.last_name !== undefined && { last_name: share.user.last_name }),
                ...(share.user.picture !== undefined && {
                    picture: {
                        ...(share.user.picture.medium !== undefined && { medium: share.user.picture.medium })
                    }
                })
            }
        })
    };
}

function mapExpense(providerExpense: z.infer<typeof ProviderExpenseSchema>): z.infer<typeof ExpenseSchema> {
    return {
        id: providerExpense.id,
        ...(providerExpense.group_id != null && { group_id: providerExpense.group_id }),
        ...(providerExpense.friendship_id != null && { friendship_id: providerExpense.friendship_id }),
        ...(providerExpense.description !== undefined && { description: providerExpense.description }),
        ...(providerExpense.repeats !== undefined && { repeats: providerExpense.repeats }),
        ...(providerExpense.repeat_interval != null && { repeat_interval: providerExpense.repeat_interval }),
        ...(providerExpense.details != null && { details: providerExpense.details }),
        ...(providerExpense.comments_count !== undefined && { comments_count: providerExpense.comments_count }),
        ...(providerExpense.payment !== undefined && { payment: providerExpense.payment }),
        ...(providerExpense.transaction_confirmed !== undefined && { transaction_confirmed: providerExpense.transaction_confirmed }),
        ...(providerExpense.cost !== undefined && { cost: providerExpense.cost }),
        ...(providerExpense.currency_code !== undefined && { currency_code: providerExpense.currency_code }),
        ...(providerExpense.repayments !== undefined && { repayments: providerExpense.repayments }),
        ...(providerExpense.date !== undefined && { date: providerExpense.date }),
        ...(providerExpense.created_at !== undefined && { created_at: providerExpense.created_at }),
        ...(providerExpense.created_by != null && { created_by: mapUser(providerExpense.created_by) }),
        ...(providerExpense.updated_at !== undefined && { updated_at: providerExpense.updated_at }),
        ...(providerExpense.updated_by != null && { updated_by: mapUser(providerExpense.updated_by) }),
        ...(providerExpense.deleted_at != null && { deleted_at: providerExpense.deleted_at }),
        ...(providerExpense.deleted_by != null && { deleted_by: mapUser(providerExpense.deleted_by) }),
        ...(providerExpense.category !== undefined && { category: providerExpense.category }),
        ...(providerExpense.receipt !== undefined && {
            receipt: {
                ...(providerExpense.receipt.large != null && { large: providerExpense.receipt.large }),
                ...(providerExpense.receipt.original != null && { original: providerExpense.receipt.original })
            }
        }),
        ...(providerExpense.users !== undefined && { users: providerExpense.users.map(mapShare) })
    };
}

const action = createAction({
    description: 'List expenses from Splitwise.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/list-expenses',
        group: 'Expenses'
    },
    input: InputSchema,
    output: OutputSchema,
    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const limit = input.limit ?? 20;
        if (limit <= 0) {
            throw new nango.ActionError({
                type: 'invalid_input',
                message: 'limit must be a positive integer'
            });
        }

        const offset = input.cursor ? parseInt(input.cursor, 10) : 0;
        if (input.cursor && Number.isNaN(offset)) {
            throw new nango.ActionError({
                type: 'invalid_input',
                message: 'cursor must be a valid integer string'
            });
        }
        if (offset < 0) {
            throw new nango.ActionError({
                type: 'invalid_input',
                message: 'cursor must correspond to a non-negative offset'
            });
        }

        const params: Record<string, string | number> = {
            limit,
            offset
        };
        if (input.group_id !== undefined) {
            params['group_id'] = input.group_id;
        }
        if (input.friend_id !== undefined) {
            params['friend_id'] = input.friend_id;
        }
        if (input.dated_after !== undefined) {
            params['dated_after'] = input.dated_after;
        }
        if (input.dated_before !== undefined) {
            params['dated_before'] = input.dated_before;
        }
        if (input.updated_after !== undefined) {
            params['updated_after'] = input.updated_after;
        }
        if (input.updated_before !== undefined) {
            params['updated_before'] = input.updated_before;
        }

        // https://dev.splitwise.com/
        const response = await nango.get({
            endpoint: '/api/v3.0/get_expenses',
            params,
            retries: 3
        });

        const providerResponse = z
            .object({
                expenses: z.array(z.unknown())
            })
            .parse(response.data);

        const providerExpenses = providerResponse.expenses.map((item) => ProviderExpenseSchema.parse(item));
        const expenses = providerExpenses.map(mapExpense);

        const hasMore = providerExpenses.length === limit;
        const nextCursor = hasMore ? String(offset + limit) : undefined;

        return {
            expenses,
            ...(nextCursor !== undefined && { next_cursor: nextCursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
