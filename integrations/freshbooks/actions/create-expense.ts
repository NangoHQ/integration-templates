import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const MetadataSchema = z.object({
    accountId: z.string().describe('FreshBooks account ID. Example: "ZyQ04o"')
});

const AmountSchema = z.object({
    amount: z.string().describe('Monetary amount as a string. Example: "150.00"'),
    code: z.string().describe('Currency code. Example: "USD"')
});

const InputSchema = z.object({
    staffid: z.number().optional().describe('Staff member ID. Defaults to 1 (account owner).'),
    categoryid: z.number().optional().describe('Expense category ID. If omitted, the first available category is fetched and used.'),
    amount: AmountSchema,
    date: z.string().describe('Expense date in YYYY-MM-DD format. Example: "2026-06-29"'),
    notes: z.string().optional().describe('Optional notes for the expense.')
});

const ProviderExpenseSchema = z.object({
    id: z.union([z.number(), z.string()]),
    staffid: z.number().nullish(),
    categoryid: z.number().nullish(),
    amount: z
        .object({
            amount: z.string().optional(),
            code: z.string().optional()
        })
        .nullish(),
    date: z.string().nullish(),
    notes: z.string().nullish(),
    vis_state: z.number().nullish()
});

const OutputSchema = z.object({
    id: z.string(),
    staffid: z.number().optional(),
    categoryid: z.number().optional(),
    amount: z
        .object({
            amount: z.string().optional(),
            code: z.string().optional()
        })
        .optional(),
    date: z.string().optional(),
    notes: z.string().optional(),
    vis_state: z.number().optional()
});

const CategoriesResponseSchema = z.object({
    response: z.object({
        result: z.object({
            categories: z.array(z.unknown())
        })
    })
});

const CategoryItemSchema = z.object({
    id: z.union([z.number(), z.string()])
});

const ExpenseCreateResponseSchema = z.object({
    response: z.object({
        result: z.object({
            expense: z.unknown()
        })
    })
});

const AuthResponseSchema = z.object({
    response: z.object({
        business_memberships: z.array(
            z.object({
                business: z.object({
                    account_id: z.string()
                })
            })
        )
    })
});

const action = createAction({
    description: 'Create an expense.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    metadata: MetadataSchema,
    scopes: ['user:expenses:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        let accountId: string | undefined;

        const metadata = await nango.getMetadata();
        const metadataResult = MetadataSchema.safeParse(metadata);
        if (metadataResult.success) {
            accountId = metadataResult.data.accountId;
        }

        if (!accountId) {
            const authConfig: ProxyConfiguration = {
                // https://www.freshbooks.com/api/authentication
                endpoint: '/auth/api/v1/users/me',
                retries: 3
            };
            const authResponse = await nango.get(authConfig);
            const parsedAuth = AuthResponseSchema.parse(authResponse.data);
            const firstMembership = parsedAuth.response.business_memberships[0];
            if (firstMembership) {
                accountId = firstMembership.business.account_id;
            }
        }

        if (!accountId) {
            throw new nango.ActionError({
                type: 'invalid_metadata',
                message: 'accountId is required in connection metadata or from FreshBooks auth response.'
            });
        }

        let categoryid = input.categoryid;

        if (categoryid === undefined) {
            const categoriesConfig: ProxyConfiguration = {
                // https://www.freshbooks.com/api/expense_categories
                endpoint: `/accounting/account/${encodeURIComponent(accountId)}/expenses/categories`,
                retries: 3
            };
            const categoriesResponse = await nango.get(categoriesConfig);

            const parsedCategories = CategoriesResponseSchema.parse(categoriesResponse.data);
            const categories = parsedCategories.response.result.categories;

            if (categories.length === 0) {
                throw new nango.ActionError({
                    type: 'missing_prerequisite',
                    message: 'No expense categories found. Please create one in FreshBooks first.'
                });
            }

            const firstCategory = CategoryItemSchema.parse(categories[0]);
            categoryid = Number(firstCategory.id);
        }

        const staffid = input.staffid ?? 1;

        const body = {
            expense: {
                staffid,
                categoryid,
                amount: input.amount,
                date: input.date,
                ...(input.notes !== undefined && { notes: input.notes })
            }
        };

        const createConfig: ProxyConfiguration = {
            // https://www.freshbooks.com/api/expenses
            endpoint: `/accounting/account/${encodeURIComponent(accountId)}/expenses/expenses`,
            data: body,
            retries: 1
        };
        const response = await nango.post(createConfig);

        const parsedCreate = ExpenseCreateResponseSchema.parse(response.data);
        const expense = ProviderExpenseSchema.parse(parsedCreate.response.result.expense);

        return {
            id: String(expense.id),
            ...(expense.staffid != null && { staffid: expense.staffid }),
            ...(expense.categoryid != null && { categoryid: expense.categoryid }),
            ...(expense.amount != null && { amount: expense.amount }),
            ...(expense.date != null && { date: expense.date }),
            ...(expense.notes != null && { notes: expense.notes }),
            ...(expense.vis_state != null && { vis_state: expense.vis_state })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
