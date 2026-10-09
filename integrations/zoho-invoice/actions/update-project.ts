import { z } from 'zod';
import { createAction } from 'nango';

const TaskInputSchema = z.object({
    task_id: z.string().optional().describe('ID of an existing project task to update. Omit to add a new task.'),
    task_name: z.string().optional().describe('Name of the task. Maximum length 100.'),
    description: z.string().optional().describe('Description of the task. Maximum length 500.'),
    rate: z.string().optional().describe('Hourly rate for the task.'),
    budget_hours: z.string().optional().describe('Planned hours for the task.')
});

const UserInputSchema = z.object({
    user_id: z.string().describe('ID of the user to assign to the project.'),
    is_current_user: z.boolean().optional().describe('Whether this user is the current user.'),
    user_name: z.string().optional().describe('Name of the user. Maximum length 200.'),
    email: z.string().optional().describe('Email of the user. Maximum length 100.'),
    user_role: z.enum(['staff', 'admin', 'timesheetstaff']).optional().describe('Role to assign to the user.'),
    status: z.string().optional().describe('Status of the user on the project.'),
    rate: z.string().optional().describe('Hourly rate for the user.'),
    budget_hours: z.string().optional().describe('Budgeted hours for the user.'),
    total_hours: z.string().optional().describe('Total hours spent by the user.'),
    billed_hours: z.string().optional().describe('Total billed hours for the user.'),
    un_billed_hours: z.string().optional().describe('Unbilled hours for the user.')
});

const InputSchema = z
    .object({
        project_id: z.string().describe('Unique ID of the project to update. Example: "460000000044019".'),
        organization_id: z.string().describe('Zoho Invoice organization ID that owns the project. Example: "10234695".'),
        project_name: z.string().optional().describe('New name for the project. Maximum length 100.'),
        customer_id: z.string().optional().describe('ID of the customer the project is billed to.'),
        description: z.string().optional().describe('Project description. Maximum length 500.'),
        billing_type: z
            .enum(['fixed_cost_for_project', 'based_on_project_hours', 'based_on_staff_hours', 'based_on_task_hours'])
            .optional()
            .describe('How the customer is billed for the project.'),
        rate: z.string().optional().describe('Hourly or fixed rate for the project.'),
        budget_type: z
            .enum(['total_project_cost', 'total_project_hours', 'hours_per_task', 'hours_per_staff'])
            .optional()
            .describe('How the project budget is tracked.'),
        budget_hours: z.string().optional().describe('Budgeted hours for the project.'),
        budget_amount: z.string().optional().describe('Budgeted amount for the project.'),
        user_id: z.string().optional().describe('ID of the user to assign to the project.'),
        tasks: z.array(TaskInputSchema).optional().describe('Tasks that make up the project.'),
        users: z.array(UserInputSchema).optional().describe('Users assigned to the project.')
    })
    .describe('Fields to update on a Zoho Invoice project. Omitted fields are left unchanged.');

const TaskSchema = z.object({
    task_id: z.string().optional().describe('Unique ID of the task.'),
    task_name: z.string().optional().describe('Name of the task.'),
    description: z.string().nullable().optional().describe('Description of the task.'),
    rate: z.number().nullable().optional().describe('Hourly rate for the task.'),
    budget_hours: z.string().nullable().optional().describe('Planned hours for the task.'),
    total_hours: z.string().nullable().optional().describe('Total hours logged against the task.'),
    billed_hours: z.string().nullable().optional().describe('Hours billed for the task.'),
    un_billed_hours: z.string().nullable().optional().describe('Unbilled hours for the task.'),
    non_billable_hours: z.string().nullable().optional().describe('Non-billable hours for the task.'),
    status: z.string().nullable().optional().describe('Status of the task.'),
    is_billable: z.boolean().nullable().optional().describe('Whether the task is billable.')
});

const UserSchema = z.object({
    user_id: z.string().optional().describe('Unique ID of the user.'),
    user_name: z.string().nullable().optional().describe('Name of the user.'),
    email: z.string().nullable().optional().describe('Email of the user.'),
    user_role: z.string().nullable().optional().describe('Role of the user on the project.'),
    is_current_user: z.boolean().nullable().optional().describe('Whether this user is the current user.'),
    status: z.string().nullable().optional().describe('Status of the user on the project.'),
    rate: z.number().nullable().optional().describe('Hourly rate for the user.'),
    budget_hours: z.string().nullable().optional().describe('Budgeted hours for the user.'),
    total_hours: z.string().nullable().optional().describe('Total hours spent by the user.'),
    billed_hours: z.string().nullable().optional().describe('Hours billed for the user.'),
    un_billed_hours: z.string().nullable().optional().describe('Unbilled hours for the user.')
});

const OutputSchema = z
    .object({
        project_id: z.string().describe('Unique ID of the updated project.'),
        project_name: z.string().describe('Name of the project.'),
        project_code: z.string().nullable().optional().describe('Project code, if one is set.'),
        customer_id: z.string().describe('ID of the customer the project is billed to.'),
        customer_name: z.string().describe('Name of the customer the project is billed to.'),
        currency_code: z.string().nullable().optional().describe('Currency code of the project.'),
        description: z.string().nullable().optional().describe('Project description.'),
        status: z.string().describe('Current project status. Example: "active".'),
        billing_type: z.string().nullable().optional().describe('Billing type configured on the project.'),
        rate: z.number().nullable().optional().describe('Rate configured on the project.'),
        budget_type: z.string().nullable().optional().describe('Budget type configured on the project.'),
        budget_amount: z.number().nullable().optional().describe('Budgeted amount for the project.'),
        total_hours: z.string().nullable().optional().describe('Total hours logged against the project.'),
        total_amount: z.number().nullable().optional().describe('Total amount of the project.'),
        billed_hours: z.string().nullable().optional().describe('Hours billed for the project.'),
        billed_amount: z.union([z.string(), z.number()]).nullable().optional().describe('Amount billed for the project.'),
        un_billed_hours: z.string().nullable().optional().describe('Unbilled hours for the project.'),
        un_billed_amount: z.union([z.string(), z.number()]).nullable().optional().describe('Unbilled amount for the project.'),
        billable_hours: z.string().nullable().optional().describe('Billable hours for the project.'),
        billable_amount: z.number().nullable().optional().describe('Billable amount for the project.'),
        non_billable_hours: z.string().nullable().optional().describe('Non-billable hours for the project.'),
        non_billable_amount: z.number().nullable().optional().describe('Non-billable amount for the project.'),
        show_in_dashboard: z.boolean().nullable().optional().describe('Whether the project is shown on the dashboard.'),
        created_time: z.string().nullable().optional().describe('Time the project was created.'),
        last_modified_time: z.string().nullable().optional().describe('Time the project was last modified.'),
        tasks: z.array(TaskSchema).nullable().optional().describe('Tasks that make up the project.'),
        users: z.array(UserSchema).nullable().optional().describe('Users assigned to the project.')
    })
    .describe('The updated Zoho Invoice project.');

const ProjectEnvelopeSchema = z.object({
    project: OutputSchema
});

/**
 * @tags: [write]
 * @tagReason: Updates fields on an existing provider project through a PUT request.
 * @pitfalls: The update is partial: omitted fields keep their current values even though the docs mark project_name, customer_id, billing_type, and user_id as required, so send only the fields you intend to change.
 */
const action = createAction({
    description: 'Update an existing project in Zoho Invoice.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ZohoInvoice.projects.UPDATE'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://www.zoho.com/invoice/api/v3/projects/#update-a-project
        const response = await nango.put({
            endpoint: `/invoice/v3/projects/${encodeURIComponent(input.project_id)}`,
            params: {
                organization_id: input.organization_id
            },
            data: {
                ...(input.project_name !== undefined && { project_name: input.project_name }),
                ...(input.customer_id !== undefined && { customer_id: input.customer_id }),
                ...(input.description !== undefined && { description: input.description }),
                ...(input.billing_type !== undefined && { billing_type: input.billing_type }),
                ...(input.rate !== undefined && { rate: input.rate }),
                ...(input.budget_type !== undefined && { budget_type: input.budget_type }),
                ...(input.budget_hours !== undefined && { budget_hours: input.budget_hours }),
                ...(input.budget_amount !== undefined && { budget_amount: input.budget_amount }),
                ...(input.user_id !== undefined && { user_id: input.user_id }),
                ...(input.tasks !== undefined && { tasks: input.tasks }),
                ...(input.users !== undefined && { users: input.users })
            },
            retries: 3
        });

        const parsed = ProjectEnvelopeSchema.parse(response.data);

        return parsed.project;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
