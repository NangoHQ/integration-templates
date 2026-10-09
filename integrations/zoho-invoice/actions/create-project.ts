import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        organization_id: z
            .string()
            .describe('ID of the Zoho Invoice organization that owns the project. Required on every Zoho Invoice API call. Example: "927270289"'),
        project_name: z.string().describe('Name of the project. Maximum length 100. Example: "Website Redesign"'),
        customer_id: z.string().describe('Unique ID of the customer the project is created for. Example: "260815000000097001"'),
        billing_type: z
            .enum(['fixed_cost_for_project', 'based_on_project_hours', 'based_on_staff_hours', 'based_on_task_hours'])
            .describe('How the customer is billed for the project. "fixed_cost_for_project" bills a flat project cost supplied as `rate`.'),
        rate: z.number().optional().describe('Total project cost for "fixed_cost_for_project", or the hourly rate for hours-based billing types. Example: 500'),
        description: z.string().optional().describe('Short note describing the project. Maximum length 500.'),
        budget_type: z
            .enum(['total_project_cost', 'total_project_hours', 'hours_per_task', 'hours_per_staff'])
            .optional()
            .describe('How the project budget is measured.'),
        budget_amount: z.number().optional().describe('Estimated total project cost, used when budgeting by cost.'),
        budget_hours: z.string().optional().describe('Budgeted hours, used when budgeting by hours. Example: "40:00"')
    })
    .describe('Input for creating a new Zoho Invoice project for a customer.');

const ProjectSchema = z
    .object({
        project_id: z.string().describe('Unique ID of the project. Example: "260815000000168011"'),
        project_name: z.string().optional().describe('Name of the project.'),
        customer_id: z.string().optional().describe('Unique ID of the customer the project belongs to.'),
        customer_name: z.string().optional().describe('Display name of the customer the project belongs to.'),
        currency_code: z.string().optional().describe('Currency code used for the project amounts. Example: "USD"'),
        description: z.string().optional().describe('Project description.'),
        status: z.string().optional().describe('Project status. Example: "active"'),
        billing_type: z.string().optional().describe('How the project is billed.'),
        rate: z.number().optional().describe('Total project cost or hourly rate, depending on the billing type.'),
        budget_type: z.string().optional().describe('How the project budget is measured.'),
        total_amount: z.number().optional().describe('Total amount of the project.'),
        total_hours: z.string().optional().describe('Total hours spent on the project. Example: "00:00"'),
        created_time: z.string().optional().describe('Project creation time in Zoho format. Example: "2026-10-09T13:36:14-0400"')
    })
    .describe('The newly created Zoho Invoice project.');

const CreateProjectResponseSchema = z.object({
    code: z.number(),
    message: z.string().optional(),
    project: ProjectSchema.optional()
});

/**
 * @tags: [write]
 * @tagReason: Creates a new project record through the provider's POST /projects endpoint.
 * @pitfalls: "organization_id" cannot be discovered with this connection's granted scopes and must be supplied by the caller; "rate" is the total project cost for "fixed_cost_for_project" but an hourly rate for hours-based billing types; the account's plan caps the number of projects, so creation fails once that limit is reached.
 */
const action = createAction({
    description: 'Create a new project for a customer.',
    version: '1.0.0',
    input: InputSchema,
    output: ProjectSchema,

    exec: async (nango, input): Promise<z.infer<typeof ProjectSchema>> => {
        const response = await nango.post<unknown>({
            // https://www.zoho.com/invoice/api/v3/projects/#create-a-project
            endpoint: '/invoice/v3/projects',
            params: {
                organization_id: input.organization_id
            },
            data: {
                project_name: input.project_name,
                customer_id: input.customer_id,
                billing_type: input.billing_type,
                ...(input.rate !== undefined && { rate: input.rate }),
                ...(input.description !== undefined && { description: input.description }),
                ...(input.budget_type !== undefined && { budget_type: input.budget_type }),
                ...(input.budget_amount !== undefined && { budget_amount: input.budget_amount }),
                ...(input.budget_hours !== undefined && { budget_hours: input.budget_hours })
            },
            // Non-idempotent create: a retry after a lost response would create a duplicate project.
            // eslint-disable-next-line @nangohq/custom-integrations-linting/proxy-call-retries
            retries: 0
        });

        const parsed = CreateProjectResponseSchema.parse(response.data);

        if (parsed.code !== 0 || !parsed.project) {
            throw new nango.ActionError({
                type: 'create_failed',
                message: parsed.message ?? 'Failed to create project',
                code: parsed.code
            });
        }

        return parsed.project;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
