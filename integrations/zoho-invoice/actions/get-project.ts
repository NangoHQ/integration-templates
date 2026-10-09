import { z } from 'zod';
import { createAction } from 'nango';

const AmountSchema = z.union([z.number(), z.string()]);

const InputSchema = z
    .object({
        organization_id: z
            .string()
            .describe(
                'Zoho Invoice organization ID. Required by every endpoint; this connection cannot look it up (its scopes exclude organizations), so supply it explicitly. Example: "927270289".'
            ),
        project_id: z.string().describe('Unique identifier of the project to retrieve. Example: "260815000000165002".')
    })
    .describe('Input for retrieving a single Zoho Invoice project by ID.');

const TaskSchema = z
    .object({
        task_id: z.string().optional().describe('Unique identifier of the task.'),
        task_name: z.string().optional().describe('Name of the task.'),
        description: z.string().optional().describe('Description of the task.'),
        rate: AmountSchema.nullable().optional().describe('Hourly rate configured for the task.'),
        budget_hours: z.string().optional().describe('Planned hours for the task, formatted as HH:MM.'),
        total_hours: z.string().optional().describe('Total hours logged against the task, formatted as HH:MM.'),
        billed_hours: z.string().optional().describe('Hours of the task that have been billed, formatted as HH:MM.'),
        un_billed_hours: z.string().optional().describe('Hours of the task that have not been billed, formatted as HH:MM.'),
        non_billable_hours: z.string().optional().describe('Non-billable hours logged against the task, formatted as HH:MM.'),
        status: z.string().optional().describe('Status of the task, for example "active".'),
        is_billable: z.boolean().optional().describe('Whether the task is billable.'),
        task_custom_fields: z.unknown().optional().describe('Custom field values configured for the task.')
    })
    .passthrough();

const UserSchema = z
    .object({
        user_id: z.string().optional().describe('Unique identifier of the user.'),
        is_current_user: z.boolean().optional().describe('Whether this user is the current API user.'),
        user_name: z.string().optional().describe('Name of the user.'),
        email: z.string().optional().describe('Email address of the user.'),
        user_role: z.string().optional().describe('Role assigned to the user on the project, for example "staff".'),
        status: z.string().optional().describe('Status of the user on the project.'),
        rate: AmountSchema.nullable().optional().describe('Hourly rate configured for the user on the project.'),
        budget_hours: z.string().optional().describe('Planned hours for the user, formatted as HH:MM.'),
        total_hours: z.string().optional().describe('Total hours logged by the user, formatted as HH:MM.'),
        billed_hours: z.string().optional().describe('Hours logged by the user that have been billed, formatted as HH:MM.'),
        un_billed_hours: z.string().optional().describe('Hours logged by the user that have not been billed, formatted as HH:MM.')
    })
    .passthrough();

const ProjectSchema = z
    .object({
        project_id: z.string().describe('Unique identifier of the project.'),
        project_name: z.string().describe('Name of the project.'),
        project_code: z.string().optional().describe('User-defined code of the project.'),
        customer_id: z.string().optional().describe('Unique identifier of the customer the project is billed to.'),
        customer_name: z.string().optional().describe('Name of the customer the project is billed to.'),
        customer_first_name: z.string().optional().describe('First name of the customer.'),
        customer_email: z.string().optional().describe('Email address of the customer.'),
        currency_id: z.string().optional().describe('Unique identifier of the project currency.'),
        currency_code: z.string().optional().describe('ISO code of the project currency. Example: "USD".'),
        description: z.string().optional().describe('Description of the project.'),
        status: z.string().optional().describe('Project status, for example "active" or "inactive".'),
        billing_type: z.string().optional().describe('How the project is billed, for example "fixed_cost_for_project".'),
        billing_rate_frequency: z.string().optional().describe('Frequency at which the project billing rate applies.'),
        rate: AmountSchema.nullable().optional().describe('Project rate.'),
        budget_type: z.string().optional().describe('Budgeting method used for the project.'),
        budget_amount: AmountSchema.nullable().optional().describe('Budgeted amount for the project.'),
        cost_budget_amount: AmountSchema.nullable().optional().describe('Cost budget for the project.'),
        is_budget_threshold_notification_enabled: z.boolean().optional().describe('Whether budget threshold notifications are enabled.'),
        is_client_approval_needed: z.boolean().optional().describe('Whether client approval is required for the project.'),
        is_user_approval_needed: z.boolean().optional().describe('Whether user approval is required for the project.'),
        hours_per_day: z.string().optional().describe('Standard working hours per day, formatted as HH:MM.'),
        project_head_id: z.string().optional().describe('Unique identifier of the project head (owner).'),
        project_head_name: z.string().optional().describe('Name of the project head (owner).'),
        is_valid_project_head: z.boolean().optional().describe('Whether the assigned project head is valid.'),
        budget_threshold: AmountSchema.nullable().optional().describe('Budget threshold percentage that triggers a notification.'),
        budget_threshold_formatted: z.string().optional().describe('Formatted budget threshold percentage.'),
        is_expense_inclusive: z.boolean().optional().describe('Whether project expenses are included in the budget.'),
        total_hours: z.string().optional().describe('Total hours logged on the project, formatted as HH:MM.'),
        total_amount: AmountSchema.nullable().optional().describe('Total value of the project.'),
        total_amount_expense_inclusive: AmountSchema.nullable().optional().describe('Total project value including expenses.'),
        billed_hours: z.string().optional().describe('Hours billed on the project, formatted as HH:MM.'),
        billed_amount: AmountSchema.nullable().optional().describe('Amount billed on the project.'),
        un_billed_hours: z.string().optional().describe('Hours not yet billed on the project, formatted as HH:MM.'),
        un_billed_amount: AmountSchema.nullable().optional().describe('Amount not yet billed on the project.'),
        billable_hours: z.string().optional().describe('Billable hours logged on the project, formatted as HH:MM.'),
        billable_amount: AmountSchema.nullable().optional().describe('Billable amount of the project.'),
        non_billable_hours: z.string().optional().describe('Non-billable hours logged on the project, formatted as HH:MM.'),
        non_billable_amount: AmountSchema.nullable().optional().describe('Non-billable amount of the project.'),
        unused_retainer_payments: AmountSchema.nullable().optional().describe('Retainer payments not yet applied to the project.'),
        has_active_recurring_profiles: z.boolean().optional().describe('Whether the project has active recurring billing profiles.'),
        created_by_id: z.string().optional().describe('Unique identifier of the user who created the project.'),
        last_modified_by_id: z.string().optional().describe('Unique identifier of the user who last modified the project.'),
        created_time: z.string().optional().describe('Timestamp when the project was created. Example: "2026-10-09T13:35:18-0400".'),
        zohopeople_project_id: z.string().optional().describe('Linked Zoho People project identifier, when applicable.'),
        is_from_zoho_people: z.boolean().optional().describe('Whether the project originated from Zoho People.'),
        zohoworkerly_project_id: z.string().optional().describe('Linked Zoho Workerly project identifier, when applicable.'),
        show_in_dashboard: z.boolean().optional().describe('Whether the project is shown in the dashboard.'),
        accounts_budgets: z.array(z.unknown()).optional().describe('Account budget breakdown configured for the project.'),
        tasks: z.array(TaskSchema).optional().describe('Tasks that make up the project.'),
        users: z.array(UserSchema).optional().describe('Users assigned to the project.'),
        custom_fields: z.array(z.unknown()).optional().describe('Custom field values configured for the project.'),
        custom_field_hash: z.record(z.string(), z.unknown()).optional().describe('Custom field values keyed by their API name.'),
        task_custom_fields: z.array(z.unknown()).optional().describe('Custom field definitions for project tasks.'),
        documents: z.array(z.unknown()).optional().describe('Documents attached to the project.')
    })
    .describe('A Zoho Invoice project, including its billing configuration, status, and associated tasks and users.');

const ProviderResponseSchema = z.object({
    project: ProjectSchema
});

/**
 * @tags: [read]
 * @tagReason: Retrieves a project's details from Zoho Invoice without modifying any provider data.
 * @pitfalls: organization_id is required and cannot be discovered with this connection's granted scopes, so callers must supply it; an unknown project_id returns a 404; monetary fields may come back as either numbers or strings.
 */
const action = createAction({
    description: 'Get a single Zoho Invoice project by ID.',
    version: '1.0.0',
    input: InputSchema,
    output: ProjectSchema,
    scopes: ['ZohoInvoice.projects.ALL'],

    exec: async (nango, input): Promise<z.infer<typeof ProjectSchema>> => {
        const response = await nango.get<unknown>({
            // https://www.zoho.com/invoice/api/v3/projects/#get-a-project
            endpoint: `/invoice/v3/projects/${encodeURIComponent(input.project_id)}`,
            params: {
                organization_id: input.organization_id
            },
            retries: 3
        });

        const parsed = ProviderResponseSchema.parse(response.data);

        return parsed.project;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
