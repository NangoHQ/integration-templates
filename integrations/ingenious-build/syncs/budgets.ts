import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const ProviderBudgetSchema = z.object({
    id: z.string(),
    type: z.string().nullish(),
    project_id: z.string().nullish(),
    status: z.string().nullish(),
    is_shared: z.boolean().nullish(),
    has_approved_phase: z.boolean().nullish(),
    created_by: z.string().nullish(),
    created_at: z.string().nullish(),
    updated_by: z.string().nullish(),
    updated_at: z.string().nullish(),
    items: z.array(z.unknown()).nullish(),
    totals: z.array(z.unknown()).nullish(),
    categories: z.array(z.unknown()).nullish(),
    phases: z.array(z.unknown()).nullish(),
    financeable_sites: z.array(z.unknown()).nullish(),
    cost_code_lists: z.array(z.string()).nullish()
});

const BudgetSchema = z.object({
    id: z.string(),
    type: z.string().optional(),
    project_id: z.string().optional(),
    status: z.string().optional(),
    is_shared: z.boolean().optional(),
    has_approved_phase: z.boolean().optional(),
    created_by: z.string().optional(),
    created_at: z.string().optional(),
    updated_by: z.string().optional(),
    updated_at: z.string().optional(),
    items: z.array(z.unknown()).optional(),
    totals: z.array(z.unknown()).optional(),
    categories: z.array(z.unknown()).optional(),
    phases: z.array(z.unknown()).optional(),
    financeable_sites: z.array(z.unknown()).optional(),
    cost_code_lists: z.array(z.string()).optional()
});

const CheckpointSchema = z.object({
    page: z.number().int().positive()
});

const sync = createSync({
    description: 'Sync budgets across projects in this workspace.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        Budget: BudgetSchema
    },

    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint();
        let nextPage: number | undefined = checkpoint && typeof checkpoint['page'] === 'number' ? checkpoint['page'] : 1;

        // Blocker: the /api/v2/pub/budgets list endpoint has no verified incremental
        // filter. Resume the current full scan by checkpointing the next page.
        if (nextPage === 1) {
            await nango.trackDeletesStart('Budget');
        }

        const proxyConfig: ProxyConfiguration = {
            // https://api.ingenious.build/reference/indexbudgetpubv2
            endpoint: '/api/v2/pub/budgets',
            paginate: {
                type: 'offset',
                offset_name_in_request: 'page',
                offset_start_value: nextPage ?? 1,
                offset_calculation_method: 'per-page',
                limit_name_in_request: 'per_page',
                limit: 100,
                response_path: 'items',
                on_page: async ({ nextPageParam }) => {
                    nextPage = typeof nextPageParam === 'number' ? nextPageParam : undefined;
                }
            },
            retries: 3
        };

        for await (const page of nango.paginate(proxyConfig)) {
            const rawItems = z.array(z.unknown()).parse(page);
            const budgets = [];

            for (const raw of rawItems) {
                const parsed = ProviderBudgetSchema.safeParse(raw);
                if (!parsed.success) {
                    throw new Error(`Failed to parse budget: ${parsed.error.message}`);
                }
                const providerBudget = parsed.data;
                const budget: z.infer<typeof BudgetSchema> = {
                    id: providerBudget.id,
                    ...(providerBudget.type != null && { type: providerBudget.type }),
                    ...(providerBudget.project_id != null && { project_id: providerBudget.project_id }),
                    ...(providerBudget.status != null && { status: providerBudget.status }),
                    ...(providerBudget.is_shared != null && { is_shared: providerBudget.is_shared }),
                    ...(providerBudget.has_approved_phase != null && { has_approved_phase: providerBudget.has_approved_phase }),
                    ...(providerBudget.created_by != null && { created_by: providerBudget.created_by }),
                    ...(providerBudget.created_at != null && { created_at: providerBudget.created_at }),
                    ...(providerBudget.updated_by != null && { updated_by: providerBudget.updated_by }),
                    ...(providerBudget.updated_at != null && { updated_at: providerBudget.updated_at }),
                    ...(providerBudget.items != null && { items: providerBudget.items }),
                    ...(providerBudget.totals != null && { totals: providerBudget.totals }),
                    ...(providerBudget.categories != null && { categories: providerBudget.categories }),
                    ...(providerBudget.phases != null && { phases: providerBudget.phases }),
                    ...(providerBudget.financeable_sites != null && { financeable_sites: providerBudget.financeable_sites }),
                    ...(providerBudget.cost_code_lists != null && { cost_code_lists: providerBudget.cost_code_lists })
                };
                budgets.push(budget);
            }

            if (budgets.length > 0) {
                await nango.batchSave(budgets, 'Budget');
            }

            if (nextPage !== undefined) {
                await nango.saveCheckpoint({ page: nextPage });
            }
        }

        await nango.clearCheckpoint();
        await nango.trackDeletesEnd('Budget');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
