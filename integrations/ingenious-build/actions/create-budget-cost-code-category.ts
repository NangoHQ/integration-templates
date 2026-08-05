import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const InputSchema = z.object({
    budget_id: z.string().describe('Budget ID. Example: "6a71de9d92e09607f906dbab"'),
    code: z.string().describe('Category code. Example: "02"'),
    name: z.string().describe('Category name. Example: "Site Work"'),
    financeable_site_id: z
        .string()
        .optional()
        .describe('Financeable site ID. If omitted, the action fetches the budget and uses the first available financeable site.')
});

const BudgetSchema = z.object({
    id: z.string(),
    financeable_sites: z
        .array(
            z.object({
                id: z.string(),
                project_site_id: z.string().optional()
            })
        )
        .optional()
});

const CreateResponseSchema = z.object({
    id: z.string()
});

const OutputSchema = z.object({
    id: z.string()
});

const action = createAction({
    description: 'Create a cost code category within a budget',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        let financeable_site_id = input.financeable_site_id;

        if (!financeable_site_id) {
            const budgetResponse = await nango.get({
                // https://api.ingenious.build/reference/getbudgetpubv2.md
                endpoint: `/api/v2/pub/budgets/${encodeURIComponent(input.budget_id)}`,
                retries: 3
            });

            const budget = BudgetSchema.parse(budgetResponse.data);
            const site = budget.financeable_sites?.[0];

            if (!site) {
                throw new nango.ActionError({
                    type: 'missing_financeable_site',
                    message: 'Budget has no financeable sites. A financeable_site_id is required to create a cost code category.',
                    budget_id: input.budget_id
                });
            }

            financeable_site_id = site.id;
        }

        const createConfig: ProxyConfiguration = {
            // https://api.ingenious.build/reference/v2-create-budget-cost-code-category-1.md
            endpoint: '/api/v2/pub/budget-cost-code-categories',
            data: {
                budget_id: input.budget_id,
                code: input.code,
                name: input.name,
                financeable_site_id: financeable_site_id
            },
            retries: 1
        };
        const createResponse = await nango.post(createConfig);

        if (createResponse.status === 409) {
            const conflictBody = z
                .object({
                    error: z
                        .object({
                            existing_id: z.string().optional()
                        })
                        .optional()
                })
                .passthrough()
                .safeParse(createResponse.data);

            throw new nango.ActionError({
                type: 'duplicate_category',
                message: 'A category with this code or name already exists for this budget.',
                existing_id: conflictBody.success ? conflictBody.data.error?.existing_id : undefined
            });
        }

        const parsed = CreateResponseSchema.safeParse(createResponse.data);

        if (!parsed.success) {
            throw new nango.ActionError({
                type: 'unexpected_response',
                message: 'Create endpoint returned an unexpected response without an id.',
                status: createResponse.status,
                data: createResponse.data
            });
        }

        return {
            id: parsed.data.id
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
