import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.number().describe('Expense ID. Example: 51023')
});

const UserSchema = z
    .object({
        id: z.number(),
        first_name: z.string().optional(),
        last_name: z.string().optional(),
        email: z.string().optional(),
        registration_status: z.string().optional(),
        picture: z
            .object({
                small: z.string().optional(),
                medium: z.string().optional(),
                large: z.string().optional()
            })
            .optional(),
        custom_picture: z.boolean().optional()
    })
    .passthrough();

const RepaymentSchema = z.object({
    from: z.number(),
    to: z.number(),
    amount: z.string()
});

const CategorySchema = z.object({
    id: z.number(),
    name: z.string()
});

const ReceiptSchema = z.object({
    large: z.string().nullable(),
    original: z.string().nullable()
});

const ExpenseUserSchema = z.object({
    user: z
        .object({
            id: z.number(),
            first_name: z.string().optional(),
            last_name: z.string().optional(),
            picture: z
                .object({
                    medium: z.string().optional()
                })
                .optional()
        })
        .passthrough()
        .optional(),
    user_id: z.number(),
    paid_share: z.string(),
    owed_share: z.string(),
    net_balance: z.string()
});

const CommentSchema = z.object({
    id: z.number(),
    content: z.string().optional(),
    comment_type: z.string().optional(),
    relation_type: z.string().optional(),
    relation_id: z.number().optional(),
    created_at: z.string().optional(),
    deleted_at: z.string().nullish(),
    user: z
        .object({
            id: z.number(),
            first_name: z.string().optional(),
            last_name: z.string().optional(),
            picture: z
                .object({
                    medium: z.string().optional()
                })
                .optional()
        })
        .passthrough()
        .optional()
});

const OutputSchema = z
    .object({
        cost: z.string(),
        description: z.string(),
        details: z.string().nullish(),
        date: z.string(),
        repeat_interval: z.string().nullish(),
        currency_code: z.string().optional(),
        category_id: z.number().nullish(),
        id: z.number(),
        group_id: z.number().nullish(),
        friendship_id: z.number().nullish(),
        expense_bundle_id: z.number().nullish(),
        repeats: z.boolean().optional(),
        email_reminder: z.boolean().optional(),
        email_reminder_in_advance: z.unknown().nullish(),
        next_repeat: z.string().nullish(),
        comments_count: z.number().optional(),
        payment: z.boolean().optional(),
        transaction_confirmed: z.boolean().optional(),
        repayments: z.array(RepaymentSchema).optional(),
        created_at: z.string().optional(),
        created_by: UserSchema.optional(),
        updated_at: z.string().optional(),
        updated_by: UserSchema.optional(),
        deleted_at: z.string().nullish(),
        deleted_by: UserSchema.nullish(),
        category: CategorySchema.optional(),
        receipt: ReceiptSchema.optional(),
        users: z.array(ExpenseUserSchema).optional(),
        comments: z.array(CommentSchema).optional()
    })
    .passthrough();

const ProviderResponseSchema = z.object({
    expense: OutputSchema
});

const action = createAction({
    description: 'Retrieve a single expense from Splitwise.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input) => {
        const response = await nango.get({
            // https://dev.splitwise.com/#tag/expenses/paths/~1get_expense~1%7Bid%7D/get
            endpoint: `/api/v3.0/get_expense/${encodeURIComponent(input.id)}`,
            retries: 3
        });

        if (!response.data || typeof response.data !== 'object' || !('expense' in response.data)) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Expense not found'
            });
        }

        const parsed = ProviderResponseSchema.parse(response.data);
        return parsed.expense;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
