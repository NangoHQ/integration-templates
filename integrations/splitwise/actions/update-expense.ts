import { z } from 'zod';
import { createAction } from 'nango';

const UserShareSchema = z.object({
    user_id: z.number().optional().describe('User ID. Example: 54123'),
    first_name: z.string().optional().describe('First name of the user. Example: "Neu"'),
    last_name: z.string().optional().describe('Last name of the user. Example: "Yewzer"'),
    email: z.string().optional().describe('Email of the user. Example: "neuyewxyz@example.com"'),
    paid_share: z.string().optional().describe('Decimal amount as a string with 2 decimal places. Example: "25.00"'),
    owed_share: z.string().optional().describe('Decimal amount as a string with 2 decimal places. Example: "13.55"')
});

const InputSchema = z.object({
    id: z.number().describe('ID of the expense to update. Example: 51023'),
    cost: z.string().optional().describe('A string representation of a decimal value, limited to 2 decimal places. Example: "25.00"'),
    description: z.string().optional().describe('A short description of the expense. Example: "Grocery run"'),
    details: z.string().nullable().optional().describe('Also known as "notes."'),
    date: z.string().optional().describe('The date and time the expense took place. Example: "2012-05-02T13:00:00Z"'),
    repeat_interval: z.enum(['never', 'weekly', 'fortnightly', 'monthly', 'yearly']).optional().describe('How often the expense repeats.'),
    currency_code: z.string().optional().describe('A currency code. Must be in the list from get_currencies. Example: "USD"'),
    category_id: z.number().optional().describe('A category id from get_categories. Example: 15'),
    group_id: z.number().optional().describe('The group to put this expense in, or 0 to create an expense outside of a group. Example: 391'),
    users: z.array(UserShareSchema).optional().describe('List of user shares. If any values are supplied, all shares for the expense will be overwritten.')
});

const RepaymentSchema = z.object({
    from: z.number(),
    to: z.number(),
    amount: z.string()
});

const PictureSchema = z.object({
    small: z.string().optional(),
    medium: z.string().optional(),
    large: z.string().optional()
});

const UserSchema = z.object({
    id: z.number(),
    first_name: z.string().optional().nullable(),
    last_name: z.string().optional().nullable(),
    email: z.string().optional().nullable(),
    registration_status: z.string().optional().nullable(),
    picture: PictureSchema.optional().nullable(),
    custom_picture: z.boolean().optional().nullable()
});

const ProviderExpenseSchema = z.object({
    id: z.number(),
    cost: z.string(),
    description: z.string(),
    details: z.string().nullable().optional(),
    date: z.string(),
    repeat_interval: z.string().optional().nullable(),
    currency_code: z.string().optional().nullable(),
    category_id: z.number().optional().nullable(),
    group_id: z.number().optional().nullable(),
    friendship_id: z.number().optional().nullable(),
    expense_bundle_id: z.number().optional().nullable(),
    repeats: z.boolean().optional().nullable(),
    email_reminder: z.boolean().optional().nullable(),
    email_reminder_in_advance: z.union([z.string(), z.number()]).nullable().optional(),
    next_repeat: z.string().nullable().optional(),
    comments_count: z.number().optional().nullable(),
    payment: z.boolean().optional().nullable(),
    transaction_confirmed: z.boolean().optional().nullable(),
    repayments: z.array(RepaymentSchema).optional().nullable(),
    created_at: z.string().optional().nullable(),
    created_by: UserSchema.optional().nullable(),
    updated_at: z.string().optional().nullable(),
    updated_by: UserSchema.optional().nullable(),
    deleted_at: z.string().nullable().optional(),
    deleted_by: UserSchema.optional().nullable()
});

const ProviderResponseSchema = z.object({
    expenses: z.array(ProviderExpenseSchema).optional().nullable(),
    errors: z.record(z.string(), z.unknown()).optional().nullable()
});

const OutputSchema = z.object({
    id: z.number(),
    cost: z.string(),
    description: z.string(),
    details: z.string().optional(),
    date: z.string(),
    repeat_interval: z.string().optional(),
    currency_code: z.string().optional(),
    category_id: z.number().optional(),
    group_id: z.number().optional(),
    friendship_id: z.number().optional(),
    expense_bundle_id: z.number().optional(),
    repeats: z.boolean().optional(),
    email_reminder: z.boolean().optional(),
    email_reminder_in_advance: z.union([z.string(), z.number()]).optional(),
    next_repeat: z.string().optional(),
    comments_count: z.number().optional(),
    payment: z.boolean().optional(),
    transaction_confirmed: z.boolean().optional(),
    repayments: z.array(RepaymentSchema).optional(),
    created_at: z.string().optional(),
    created_by: UserSchema.optional(),
    updated_at: z.string().optional(),
    updated_by: UserSchema.optional(),
    deleted_at: z.string().optional(),
    deleted_by: UserSchema.optional()
});

function flattenUsers(users: z.infer<typeof InputSchema>['users']): Record<string, string | number> {
    const flat: Record<string, string | number> = {};
    if (!users) {
        return flat;
    }
    for (let i = 0; i < users.length; i++) {
        const user = users[i];
        if (user === undefined) {
            continue;
        }
        if (user.user_id !== undefined) {
            flat[`users__${i}__user_id`] = user.user_id;
        }
        if (user.first_name !== undefined) {
            flat[`users__${i}__first_name`] = user.first_name;
        }
        if (user.last_name !== undefined) {
            flat[`users__${i}__last_name`] = user.last_name;
        }
        if (user.email !== undefined) {
            flat[`users__${i}__email`] = user.email;
        }
        if (user.paid_share !== undefined) {
            flat[`users__${i}__paid_share`] = user.paid_share;
        }
        if (user.owed_share !== undefined) {
            flat[`users__${i}__owed_share`] = user.owed_share;
        }
    }
    return flat;
}

const action = createAction({
    description: 'Update a expense in Splitwise.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const data: Record<string, unknown> = {};
        if (input.cost !== undefined) {
            data['cost'] = input.cost;
        }
        if (input.description !== undefined) {
            data['description'] = input.description;
        }
        if (input.details !== undefined) {
            data['details'] = input.details;
        }
        if (input.date !== undefined) {
            data['date'] = input.date;
        }
        if (input.repeat_interval !== undefined) {
            data['repeat_interval'] = input.repeat_interval;
        }
        if (input.currency_code !== undefined) {
            data['currency_code'] = input.currency_code;
        }
        if (input.category_id !== undefined) {
            data['category_id'] = input.category_id;
        }
        if (input.group_id !== undefined) {
            data['group_id'] = input.group_id;
        }
        const flatUsers = flattenUsers(input.users);
        Object.assign(data, flatUsers);

        // https://dev.splitwise.com/#tag/expenses/paths/~1update_expense~1{id}/post
        const response = await nango.post({
            endpoint: `/api/v3.0/update_expense/${encodeURIComponent(String(input.id))}`,
            data,
            retries: 3
        });

        const parsed = ProviderResponseSchema.safeParse(response.data);
        if (!parsed.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Failed to parse the provider response.'
            });
        }

        const body = parsed.data;

        if (body.errors && Object.keys(body.errors).length > 0) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: 'Splitwise returned errors for the update request.',
                errors: body.errors
            });
        }

        const expenses = body.expenses ?? [];
        if (expenses.length === 0 || expenses[0] === undefined) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'No expense was returned after the update.'
            });
        }

        const expense = expenses[0];

        return {
            id: expense.id,
            cost: expense.cost,
            description: expense.description,
            ...(expense.details != null && { details: expense.details }),
            date: expense.date,
            ...(expense.repeat_interval != null && { repeat_interval: expense.repeat_interval }),
            ...(expense.currency_code != null && { currency_code: expense.currency_code }),
            ...(expense.category_id != null && { category_id: expense.category_id }),
            ...(expense.group_id != null && { group_id: expense.group_id }),
            ...(expense.friendship_id != null && { friendship_id: expense.friendship_id }),
            ...(expense.expense_bundle_id != null && { expense_bundle_id: expense.expense_bundle_id }),
            ...(expense.repeats != null && { repeats: expense.repeats }),
            ...(expense.email_reminder != null && { email_reminder: expense.email_reminder }),
            ...(expense.email_reminder_in_advance != null && { email_reminder_in_advance: expense.email_reminder_in_advance }),
            ...(expense.next_repeat != null && { next_repeat: expense.next_repeat }),
            ...(expense.comments_count != null && { comments_count: expense.comments_count }),
            ...(expense.payment != null && { payment: expense.payment }),
            ...(expense.transaction_confirmed != null && { transaction_confirmed: expense.transaction_confirmed }),
            ...(expense.repayments != null && { repayments: expense.repayments }),
            ...(expense.created_at != null && { created_at: expense.created_at }),
            ...(expense.created_by != null && { created_by: expense.created_by }),
            ...(expense.updated_at != null && { updated_at: expense.updated_at }),
            ...(expense.updated_by != null && { updated_by: expense.updated_by }),
            ...(expense.deleted_at != null && { deleted_at: expense.deleted_at }),
            ...(expense.deleted_by != null && { deleted_by: expense.deleted_by })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
