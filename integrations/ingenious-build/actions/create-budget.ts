import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    project_id: z.string().describe('Global ID of the project. Example: "6a71de59f55241acad0cd44e"'),
    type: z.enum(['my_budget', 'owner_budget']).optional().describe('Budget type. Defaults to "my_budget".'),
    cost_code_list_id: z.string().optional().nullable().describe('ID of the cost code list to apply to the budget.'),
    cost_code_template_id: z.string().optional().nullable().describe('ID of the cost code template to apply to the budget.')
});

const ProviderResponseSchema = z.object({
    id: z.string()
});

const OutputSchema = z.object({
    id: z.string()
});

const action = createAction({
    description: 'Create a new budget for a project.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://api.ingenious.build/reference/createbudgetpubv2-1.md
            endpoint: '/api/v2/pub/budgets',
            data: {
                project_id: input.project_id,
                ...(input.type !== undefined && { type: input.type }),
                ...(input.cost_code_list_id !== undefined && { cost_code_list_id: input.cost_code_list_id }),
                ...(input.cost_code_template_id !== undefined && { cost_code_template_id: input.cost_code_template_id })
            },
            retries: 10
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'api_error',
                message: 'Budget creation failed with no response data.'
            });
        }

        const providerResponse = ProviderResponseSchema.parse(response.data);

        return {
            id: providerResponse.id
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
