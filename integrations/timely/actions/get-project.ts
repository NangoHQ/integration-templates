import { z } from 'zod';
import { createAction } from 'nango';

const CurrencySchema = z.object({
    id: z.string().describe('Currency identifier code. Example: "kes"'),
    name: z.string().describe('Human-readable currency name. Example: "Kenyan Shilling"'),
    iso_code: z.string().describe('ISO 4217 currency code. Example: "KES"'),
    symbol: z.string().describe('Currency symbol. Example: "KSh"'),
    symbol_first: z.boolean().describe('Whether the currency symbol is displayed before the amount')
});

const MoneySchema = z.object({
    fractional: z.number().describe('Amount expressed in the smallest currency unit (cents)'),
    formatted: z.string().describe('Pre-formatted amount string including the currency symbol'),
    amount: z.number().describe('Decimal amount'),
    currency_code: z.string().describe('Lowercase currency code. Example: "kes"')
});

const DurationSchema = z.object({
    hours: z.number().describe('Whole hours component of the duration'),
    minutes: z.number().describe('Whole minutes component of the duration'),
    seconds: z.number().describe('Whole seconds component of the duration'),
    formatted: z.string().describe('Formatted hours:minutes string. Example: "01:30"'),
    total_hours: z.number().describe('Total duration expressed in decimal hours'),
    total_seconds: z.number().describe('Total duration expressed in seconds'),
    total_minutes: z.number().describe('Total duration expressed in minutes')
});

const ProjectClientSchema = z.object({
    id: z.number().describe('Client ID'),
    name: z.string().describe('Client name'),
    color: z.string().describe('Client display color as a hex string'),
    active: z.boolean().describe('Whether the client is active'),
    external_id: z.string().nullable().describe('External identifier assigned to the client, or null when unset'),
    updated_at: z.string().describe('When the client was last updated (ISO 8601)')
});

const ProjectUserSchema = z.object({
    user_id: z.number().describe('ID of the user associated with the project'),
    hour_rate: z.number().describe('Billable hourly rate for this user on the project'),
    hour_rate_in_cents: z.number().describe('Billable hourly rate in cents'),
    internal_hour_rate: z.number().describe('Internal cost hourly rate for this user on the project'),
    internal_hour_rate_in_cents: z.number().describe('Internal cost hourly rate in cents'),
    deleted: z.boolean().describe('Whether the user-project association is deleted'),
    created_at: z.string().describe('When the user was associated with the project (ISO 8601)'),
    updated_at: z.string().describe('When the association was last updated (ISO 8601)')
});

const ProjectLabelAssignmentSchema = z.object({
    project_id: z.number().describe('ID of the project the label is assigned to'),
    label_id: z.number().describe('ID of the assigned label'),
    budget: z.number().describe('Budget allocated to this label on the project'),
    required: z.boolean().describe('Whether logging time requires selecting this label'),
    default: z.boolean().describe('Whether this label is selected by default'),
    updated_at: z.string().describe('When the label assignment was last updated (ISO 8601)')
});

const OutputSchema = z
    .object({
        id: z.number().describe('Project ID'),
        active: z.boolean().describe('Whether the project is active'),
        account_id: z.number().describe('ID of the account the project belongs to'),
        name: z.string().describe('Project name'),
        description: z.string().nullable().describe('Project description, or null when unset'),
        color: z.string().nullable().describe('Project display color as a hex string, or null when unset'),
        rate_type: z.string().describe('Billing rate type of the project. Example: "non-billable"'),
        billable: z.boolean().describe('Whether the project is billable'),
        created_at: z.number().describe('When the project was created (Unix timestamp in seconds)'),
        updated_at: z.number().describe('When the project was last updated (Unix timestamp in seconds)'),
        external_id: z.string().nullable().describe('External identifier assigned to the project, or null when unset'),
        budget_scope: z.unknown().nullable().describe('Scope of the project budget when configured, otherwise null'),
        client: ProjectClientSchema.nullable().describe('Client the project belongs to, or null when none is set'),
        required_notes: z.boolean().describe('Whether time entries on the project require a note'),
        required_labels: z.boolean().describe('Whether time entries on the project require a label'),
        budget_expired_on: z.string().nullable().describe('Date the project budget expired, or null when not set'),
        has_recurrence: z.boolean().describe('Whether the project has recurring budget logic'),
        enable_labels: z.string().describe('Label mode for the project. Example: "none" or "all"'),
        default_labels: z.boolean().describe('Whether default labels are enabled for the project'),
        currency: CurrencySchema.describe('Currency the project amounts are expressed in'),
        team_ids: z.array(z.number()).describe('IDs of teams the project is shared with'),
        budget: z.number().describe('Project budget amount'),
        budget_type: z.string().describe('Project budget type'),
        budget_calculation: z.string().describe('How progress toward the project budget is calculated'),
        hour_rate: z.number().describe('Default billable hourly rate for the project'),
        hour_rate_in_cents: z.number().describe('Default billable hourly rate in cents'),
        budget_progress: z.number().describe('Progress toward the project budget'),
        budget_percent: z.number().describe('Progress toward the project budget as a percentage'),
        invoice_by_budget: z.boolean().describe('Whether invoices are based on the project budget'),
        users: z.array(ProjectUserSchema).describe('Users associated with the project'),
        labels: z.array(ProjectLabelAssignmentSchema).describe('Labels available or assigned on the project'),
        label_ids: z.array(z.number()).describe('IDs of all labels available on the project'),
        required_label_ids: z.array(z.number()).describe('IDs of labels required when logging time on the project'),
        default_label_ids: z.array(z.number()).describe('IDs of labels selected by default on the project'),
        cost: MoneySchema.describe('All-time logged cost for the project'),
        estimated_cost: MoneySchema.describe('Estimated cost for the project'),
        duration: DurationSchema.describe('All-time logged duration for the project'),
        estimated_duration: DurationSchema.describe('Estimated duration for the project'),
        billed_cost: MoneySchema.describe('All-time billed cost for the project'),
        billed_duration: DurationSchema.describe('All-time billed duration for the project'),
        unbilled_cost: MoneySchema.describe('All-time unbilled cost for the project'),
        unbilled_duration: DurationSchema.describe('All-time unbilled duration for the project'),
        first_logged_on: z.string().nullable().describe('First day time was logged on the project (YYYY-MM-DD), or null when no time has been logged'),
        last_logged_on: z.string().nullable().describe('Most recent day time was logged on the project (YYYY-MM-DD), or null when no time has been logged'),
        locked_hours: z.boolean().describe('Whether logged hours on the project are locked'),
        created_from: z.string().describe('Source the project was created from. Example: "Web"'),
        allow_only_one_tag: z.boolean().describe('Whether only one label may be selected per time entry')
    })
    .describe('A single Timely project, including its all-time logged duration and cost aggregates');

const InputSchema = z
    .object({
        account_id: z
            .number()
            .int()
            .positive()
            .describe('Timely account ID. Discover it with list-accounts; every project call is scoped to an account. Example: 1145787'),
        project_id: z.number().int().positive().describe('ID of the project to retrieve. Example: 5691492')
    })
    .describe('Input for retrieving a single project from Timely');

function isNotFoundError(error: unknown): boolean {
    if (typeof error !== 'object' || error === null || !('response' in error)) {
        return false;
    }
    const response = error.response;
    return typeof response === 'object' && response !== null && 'status' in response && response.status === 404;
}

/**
 * @tags: [read]
 * @tagReason: Retrieves a single project from Timely; no provider state is created, updated, or deleted.
 * @pitfalls: The duration, cost, billed and unbilled aggregates are always all-time totals — date filters are silently ignored, so use get-project-time-summary or get-time-report for a date-scoped total. A non-existent or deleted project raises a not-found error instead of returning an empty result.
 */
const action = createAction({
    description: 'Retrieve a single project by ID, including its all-time logged duration/cost aggregates.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // @allowTryCatch: translate a missing project into a typed ActionError instead of leaking a raw HTTP error to the caller.
        try {
            // https://developer.timely.com/
            const response = await nango.get<unknown>({
                endpoint: `/1.1/${input.account_id}/projects/${input.project_id}`,
                retries: 3
            });

            return OutputSchema.parse(response.data);
        } catch (error) {
            if (isNotFoundError(error)) {
                throw new nango.ActionError({
                    type: 'not_found',
                    message: `Project ${input.project_id} was not found in account ${input.account_id}.`,
                    project_id: input.project_id
                });
            }
            throw error;
        }
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
