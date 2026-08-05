import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.'),
    per_page: z.number().int().min(1).max(100).optional().describe('Number of items to return per page. Maximum is 100.')
});

const BudgetItemTaskSchema = z.object({
    id: z.string(),
    description: z.string().nullable().optional(),
    unit_quantity: z.string().optional(),
    unit_type: z.string().optional(),
    unit_value: z.string().nullable().optional(),
    total_value: z.string().optional()
});

const BudgetItemTotalsSchema = z.object({
    budget_rom_value: z.string().optional(),
    anticipated_savings_value: z.string().optional(),
    budget_original_value: z.string().optional(),
    my_approved_contract_changes_value: z.string().optional(),
    total_current_value: z.string().optional(),
    total_projected_value: z.string().optional(),
    total_pending_value: z.string().optional(),
    total_approved_value: z.string().optional(),
    unallocated_fund_value: z.string().optional(),
    total_anticipated_cost_value: z.string().optional(),
    variance_to_the_budget_value: z.string().optional(),
    gross_previous_applications_value: z.string().optional(),
    gross_current_application_value: z.string().optional(),
    material_stored_offsite_value: z.string().optional(),
    gross_total_completed_and_stored_value: z.string().optional(),
    gross_total_completed_and_stored_percent_value: z.string().optional(),
    gross_balance_to_complete_value: z.string().optional(),
    previous_retention_value: z.string().optional(),
    previous_retention_percent_value: z.string().optional(),
    current_retention_value: z.string().optional(),
    current_retention_percent_value: z.string().optional(),
    material_stored_retention_value: z.string().optional(),
    material_stored_retention_percent_value: z.string().optional(),
    total_retention_value: z.string().optional(),
    total_retention_percent_value: z.string().optional(),
    net_previous_application_value: z.string().optional(),
    net_current_application_value: z.string().optional(),
    net_total_completed_and_stored_value: z.string().optional(),
    net_total_completed_and_stored_percent_value: z.string().optional(),
    net_balance_to_complete_value: z.string().optional(),
    net_balance_to_complete_percent_value: z.string().optional(),
    paid_value: z.string().optional(),
    paid_percent_value: z.string().optional(),
    unpaid_value: z.string().optional(),
    unpaid_percent_value: z.string().optional()
});

const BudgetLineItemSchema = z.object({
    id: z.string(),
    budget_id: z.string().optional(),
    description: z.string().nullable().optional(),
    tags: z.array(z.string()).optional(),
    files: z.array(z.string()).optional(),
    tasks: z.array(BudgetItemTaskSchema).optional(),
    code_id: z.string().optional(),
    code: z.string().optional(),
    code_name: z.string().optional(),
    category_id: z.string().optional(),
    allow_charges: z.boolean().optional(),
    allow_contracting: z.boolean().optional(),
    totals: z.preprocess((val) => (val === null ? undefined : val), BudgetItemTotalsSchema.optional()),
    created_at: z.string().optional(),
    updated_at: z.string().optional()
});

const BudgetCategorySchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    code: z.string().optional(),
    parent_id: z.string().nullable().optional(),
    phase_id: z.string().nullable().optional(),
    financeable_site_id: z.string().optional(),
    order: z.number().optional()
});

const BudgetPhaseSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    code: z.string().optional(),
    financeable_site_id: z.string().optional(),
    order: z.number().optional()
});

const BudgetFinanceableSiteSchema = z.object({
    id: z.string(),
    project_site_id: z.string().optional()
});

const BudgetTotalsSchema = z.object({
    budget_rom_value: z.string().optional(),
    budget_original_value: z.string().optional(),
    budget_current_value: z.string().optional(),
    budget_projected_value: z.string().optional(),
    budget_pending_value: z.string().optional(),
    budget_approved_value: z.string().optional(),
    total_anticipated_cost_value: z.string().optional(),
    variance_to_the_budget_value: z.string().optional(),
    gross_previous_applications_value: z.string().optional(),
    gross_current_application_value: z.string().optional(),
    material_stored_offsite_value: z.string().optional(),
    gross_total_completed_and_stored_value: z.string().optional(),
    gross_total_completed_and_stored_percent_value: z.string().optional(),
    gross_balance_to_complete_value: z.string().optional(),
    previous_retention_value: z.string().optional(),
    previous_retention_percent_value: z.string().optional(),
    current_retention_value: z.string().optional(),
    current_retention_percent_value: z.string().optional(),
    material_stored_retention_value: z.string().optional(),
    material_stored_retention_percent_value: z.string().optional(),
    total_retention_value: z.string().optional(),
    total_retention_percent_value: z.string().optional(),
    net_previous_application_value: z.string().optional(),
    net_current_application_value: z.string().optional(),
    net_total_completed_and_stored_value: z.string().optional(),
    net_total_completed_and_stored_percent_value: z.string().optional(),
    net_balance_to_complete_value: z.string().optional(),
    net_balance_to_complete_percent_value: z.string().optional(),
    paid_value: z.string().optional(),
    paid_percent_value: z.string().optional(),
    unpaid_value: z.string().optional(),
    unpaid_percent_value: z.string().optional()
});

const BudgetSchema = z.object({
    id: z.string(),
    type: z.string().optional(),
    project_id: z.string().optional(),
    status: z.string().optional(),
    is_shared: z.boolean().nullable().optional(),
    items: z.preprocess((val) => (val === null ? undefined : val), z.array(BudgetLineItemSchema).optional()),
    totals: z.preprocess((val) => (val === null ? undefined : val), z.array(BudgetTotalsSchema).optional()),
    categories: z.preprocess((val) => (val === null ? undefined : val), z.array(BudgetCategorySchema).optional()),
    phases: z.preprocess((val) => (val === null ? undefined : val), z.array(BudgetPhaseSchema).optional()),
    financeable_sites: z.preprocess((val) => (val === null ? undefined : val), z.array(BudgetFinanceableSiteSchema).optional()),
    cost_code_lists: z.preprocess((val) => (val === null ? undefined : val), z.array(z.string()).optional()),
    has_approved_phase: z.boolean().nullable().optional(),
    created_by: z.string().optional(),
    created_at: z.string().optional(),
    updated_by: z.string().optional(),
    updated_at: z.string().optional()
});

const OutputSchema = z.object({
    items: z.array(BudgetSchema),
    next_cursor: z.string().optional()
});

const ListResponseSchema = z.object({
    items: z.array(z.unknown()),
    total: z.number().optional(),
    page: z.number().optional(),
    per_page: z.number().optional(),
    first_page_url: z.string().optional(),
    last_page_url: z.string().optional(),
    next_page_url: z.string().nullable().optional(),
    prev_page_url: z.string().nullable().optional()
});

const action = createAction({
    description: 'List budgets across projects in this workspace.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        let page = 1;
        let perPage = input.per_page ?? 20;

        // The page size is encoded in the cursor (rather than relying solely on the page number)
        // so that a caller supplying a different per_page on a follow-up call can't desync the
        // scan and skip or repeat budgets.
        if (input.cursor !== undefined) {
            const match = /^(\d+):(\d+)$/.exec(input.cursor);
            const pageStr = match?.[1];
            const perPageStr = match?.[2];
            if (pageStr === undefined || perPageStr === undefined) {
                throw new nango.ActionError({
                    type: 'invalid_cursor',
                    message: 'cursor must be a value returned by a previous call to this action'
                });
            }
            page = parseInt(pageStr, 10);
            perPage = parseInt(perPageStr, 10);
            if (page < 1) {
                throw new nango.ActionError({
                    type: 'invalid_cursor',
                    message: 'cursor must be a value returned by a previous call to this action'
                });
            }
        }

        // https://api.ingenious.build/reference/indexbudgetpubv2.md
        const response = await nango.get({
            endpoint: '/api/v2/pub/budgets',
            params: {
                page: String(page),
                per_page: String(perPage)
            },
            retries: 3
        });

        const parsed = ListResponseSchema.parse(response.data);

        const items = parsed.items.map((item) => BudgetSchema.parse(item));

        const nextCursor = parsed.next_page_url != null ? `${page + 1}:${perPage}` : undefined;

        return {
            items,
            ...(nextCursor !== undefined && { next_cursor: nextCursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
