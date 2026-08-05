import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('Budget ID. Example: "6a71de9d92e09607f906dbab"')
});

const FinanceableSiteSchema = z.object({
    id: z.string(),
    project_site_id: z.string()
});

const ProviderBudgetSchema = z
    .object({
        id: z.string(),
        type: z.string(),
        project_id: z.string(),
        status: z.string(),
        is_shared: z.boolean().nullish(),
        items: z.array(z.record(z.string(), z.unknown())).nullish(),
        categories: z.array(z.record(z.string(), z.unknown())).nullish(),
        phases: z.array(z.record(z.string(), z.unknown())).nullish(),
        financeable_sites: z.array(FinanceableSiteSchema).nullish(),
        cost_code_lists: z.unknown().nullish(),
        has_approved_phase: z.boolean().nullish(),
        totals: z.record(z.string(), z.unknown()).nullish()
    })
    .passthrough();

const OutputSchema = z.object({
    id: z.string(),
    type: z.string(),
    project_id: z.string(),
    status: z.string(),
    is_shared: z.boolean().optional(),
    items: z.array(z.record(z.string(), z.unknown())).optional(),
    categories: z.array(z.record(z.string(), z.unknown())).optional(),
    phases: z.array(z.record(z.string(), z.unknown())).optional(),
    financeable_sites: z.array(FinanceableSiteSchema).optional(),
    cost_code_lists: z.unknown().optional(),
    has_approved_phase: z.boolean().optional(),
    totals: z.record(z.string(), z.unknown()).optional()
});

const action = createAction({
    description: 'Get a single budget by id, including its cost code items, categories, and phases.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://api.ingenious.build/reference/getbudgetpubv2
            endpoint: `/api/v2/pub/budgets/${encodeURIComponent(input.id)}`,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Budget not found',
                budget_id: input.id
            });
        }

        const providerBudget = ProviderBudgetSchema.parse(response.data);

        return {
            id: providerBudget.id,
            type: providerBudget.type,
            project_id: providerBudget.project_id,
            status: providerBudget.status,
            ...(providerBudget.is_shared != null && { is_shared: providerBudget.is_shared }),
            ...(providerBudget.items != null && { items: providerBudget.items }),
            ...(providerBudget.categories != null && { categories: providerBudget.categories }),
            ...(providerBudget.phases != null && { phases: providerBudget.phases }),
            ...(providerBudget.financeable_sites != null && { financeable_sites: providerBudget.financeable_sites }),
            ...(providerBudget.cost_code_lists != null && { cost_code_lists: providerBudget.cost_code_lists }),
            ...(providerBudget.has_approved_phase != null && { has_approved_phase: providerBudget.has_approved_phase }),
            ...(providerBudget.totals != null && { totals: providerBudget.totals })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
