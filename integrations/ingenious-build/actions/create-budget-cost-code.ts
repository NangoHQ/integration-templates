import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    code: z.string().max(25).describe('Cost code. Example: "01-400"'),
    name: z.string().min(3).max(150).describe('Cost code name. Example: "Concrete"'),
    budget_id: z.string().describe('ID of the budget. Example: "6a71de9d92e09607f906dbab"'),
    budget_cost_code_category_id: z.string().describe('ID of the budget cost code category. Example: "6a71df24f55241acad0cd518"'),
    financeable_site_id: z.string().describe('ID of the financeable site. Required even though not documented. Example: "..."'),
    description: z.string().min(3).max(500).optional().describe('Cost code description.'),
    budget_code_type: z.string().optional().describe('Cost code type ID.'),
    expenditure_type: z.enum(['CapEx', 'OpEx']).optional().describe('Expenditure type.'),
    analytic_cost_code_id: z.string().optional().describe('Analytic cost code ID reference.'),
    flat_value: z.string().optional().describe('Decimal budget original value. Overwrites any existing value including line items. Example: "10750.05"'),
    lines: z
        .array(
            z.object({
                description: z.string(),
                unit_type: z.string(),
                unit_quantity: z.string().optional(),
                unit_value: z.string().optional(),
                percent_of_source_id: z.string().optional(),
                percent_of_source_type: z.enum(['budget', 'financeable-site', 'project-phase', 'category', 'cost-code']).optional(),
                percent_of_source_quantity: z.string().optional()
            })
        )
        .optional()
        .describe('Budget item lines. Only one of flat_value or lines can be provided.'),
    budget_rom_value: z.string().optional().describe('Decimal ROM/Planned budget value. Example: "10750.05"')
});

const OutputSchema = z.object({
    id: z.string().describe('ID of the created budget cost code.')
});

const ProviderResponseSchema = z.object({
    id: z.string()
});

const action = createAction({
    description: 'Create a cost code within a budget cost code category.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['budgets'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://api.ingenious.build/reference/create-budget-cost-code-pub-v2-1.md
            endpoint: '/api/v2/pub/budget-cost-codes',
            data: {
                code: input.code,
                name: input.name,
                budget_id: input.budget_id,
                budget_cost_code_category_id: input.budget_cost_code_category_id,
                financeable_site_id: input.financeable_site_id,
                ...(input.description !== undefined && { description: input.description }),
                ...(input.budget_code_type !== undefined && { budget_code_type: input.budget_code_type }),
                ...(input.expenditure_type !== undefined && { expenditure_type: input.expenditure_type }),
                ...(input.analytic_cost_code_id !== undefined && { analytic_cost_code_id: input.analytic_cost_code_id }),
                ...(input.flat_value !== undefined && { flat_value: input.flat_value }),
                ...(input.lines !== undefined && { lines: input.lines }),
                ...(input.budget_rom_value !== undefined && { budget_rom_value: input.budget_rom_value })
            },
            retries: 10
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        return {
            id: providerResponse.id
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
