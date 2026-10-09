import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const CurrencySchema = z.object({
    id: z.string().describe('Currency identifier, for example "kes".'),
    name: z.string().describe('Currency display name, for example "Kenyan Shilling".'),
    iso_code: z.string().describe('ISO 4217 currency code, for example "KES".'),
    symbol: z.string().describe('Currency symbol, for example "KSh".'),
    symbol_first: z.boolean().describe('Whether the currency symbol is shown before the amount.')
});

const ClientSchema = z.object({
    id: z.number().describe('Numeric id of the client (company).'),
    name: z.string().describe('Client display name.'),
    color: z.string().describe('Client color as a hex string without a leading #.'),
    active: z.boolean().describe('Whether the client is active.'),
    external_id: z.string().nullable().describe('Caller-supplied external identifier, or null when unset.'),
    updated_at: z.string().describe('ISO 8601 timestamp of when the client was last updated.')
});

const ProjectUserSchema = z.object({
    user_id: z.number().describe('Numeric id of the user assigned to the project.'),
    hour_rate: z.number().describe('Billable hourly rate for this user on the project.'),
    hour_rate_in_cents: z.number().describe('Billable hourly rate in cents for this user on the project.'),
    updated_at: z.string().describe('ISO 8601 timestamp of when this project-user link was last updated.'),
    created_at: z.string().describe('ISO 8601 timestamp of when this project-user link was created.'),
    deleted: z.boolean().describe('Whether this user has been removed from the project.'),
    internal_hour_rate: z.number().describe('Internal cost hourly rate for this user on the project.'),
    internal_hour_rate_in_cents: z.number().describe('Internal cost hourly rate in cents for this user on the project.')
});

const ProjectLabelSchema = z.object({
    project_id: z.number().describe('Numeric id of the project the label is attached to.'),
    label_id: z.number().describe('Numeric id of the attached label.'),
    budget: z.number().describe('Budget assigned to this label within the project.'),
    required: z.boolean().describe('Whether the label is required on events for the project.'),
    default: z.boolean().describe('Whether the label is applied by default to new events.'),
    updated_at: z.string().describe('ISO 8601 timestamp of when this project-label link was last updated.')
});

const CostSchema = z.object({
    fractional: z.number().describe('Cost amount as a fractional value.'),
    formatted: z.string().describe('Cost amount formatted with its currency symbol.'),
    amount: z.number().describe('Cost amount as an integer in minor units.'),
    currency_code: z.string().describe('Currency code the cost is expressed in.')
});

const DurationSchema = z.object({
    hours: z.number().describe('Whole hours component of the duration.'),
    minutes: z.number().describe('Whole minutes component of the duration.'),
    seconds: z.number().describe('Whole seconds component of the duration.'),
    formatted: z.string().describe('Duration formatted as HH:MM.'),
    total_hours: z.number().describe('Total duration expressed in hours.'),
    total_seconds: z.number().describe('Total duration expressed in seconds.'),
    total_minutes: z.number().describe('Total duration expressed in minutes.')
});

const ProjectSchema = z
    .object({
        id: z.string().describe('Unique project identifier (the provider numeric id as a string).'),
        active: z.boolean().describe('Whether the project is active.'),
        account_id: z.number().describe('Numeric id of the Timely account that owns the project.'),
        name: z.string().describe('Project name.'),
        description: z.string().nullable().describe('Project description, or null when unset.'),
        color: z.string().nullable().describe('Project color as a hex string without a leading #, or null when unset.'),
        rate_type: z.string().describe('Rate type used by the project, for example "user" or "non-billable".'),
        billable: z.boolean().describe('Whether the project is billable.'),
        created_at: z.number().describe('Unix timestamp in seconds when the project was created.'),
        updated_at: z.number().describe('Unix timestamp in seconds when the project was last updated.'),
        external_id: z.string().nullable().describe('Caller-supplied external identifier, or null when unset.'),
        budget_scope: z.string().nullable().describe('Budget scope of the project, or null when no budget is scoped.'),
        client: ClientSchema.describe('Client (company) the project belongs to.'),
        required_notes: z.boolean().describe('Whether notes are required on events logged against the project.'),
        required_labels: z.boolean().describe('Whether labels are required on events logged against the project.'),
        budget_expired_on: z.string().nullable().describe('Date the project budget expires, or null when it does not expire.'),
        has_recurrence: z.boolean().describe('Whether the project has a recurring schedule.'),
        enable_labels: z.string().describe('Label mode for the project, for example "none" or "all".'),
        default_labels: z.boolean().describe('Whether default labels are applied to events logged against the project.'),
        currency: CurrencySchema.describe('Currency used for the project.'),
        team_ids: z.array(z.number()).describe('Numeric ids of the teams the project is shared with.'),
        budget: z.number().describe('Project budget amount.'),
        budget_type: z.string().describe('Project budget type, or an empty string when unset.'),
        budget_calculation: z.string().describe('How the project budget is calculated, for example "pending".'),
        hour_rate: z.number().describe('Default billable hourly rate for the project.'),
        hour_rate_in_cents: z.number().describe('Default billable hourly rate in cents for the project.'),
        budget_progress: z.number().describe('Amount of budget consumed so far.'),
        budget_percent: z.number().describe('Percentage of budget consumed so far.'),
        invoice_by_budget: z.boolean().describe('Whether the project is invoiced against its budget.'),
        users: z.array(ProjectUserSchema).describe('Users assigned to the project.'),
        labels: z.array(ProjectLabelSchema).describe('Labels attached to the project.'),
        label_ids: z.array(z.number()).describe('Numeric ids of the labels attached to the project.'),
        required_label_ids: z.array(z.number()).describe('Numeric ids of the labels required on events for the project.'),
        default_label_ids: z.array(z.number()).describe('Numeric ids of the labels applied by default to new events.'),
        cost: CostSchema.describe('All-time logged cost for the project.'),
        estimated_cost: CostSchema.describe('Estimated cost for the project.'),
        duration: DurationSchema.describe('All-time logged duration for the project.'),
        estimated_duration: DurationSchema.describe('Estimated duration for the project.'),
        billed_cost: CostSchema.describe('All-time billed cost for the project.'),
        billed_duration: DurationSchema.describe('All-time billed duration for the project.'),
        unbilled_cost: CostSchema.describe('All-time unbilled cost for the project.'),
        unbilled_duration: DurationSchema.describe('All-time unbilled duration for the project.'),
        created_from: z.string().describe('Source the project was created from, for example "Nango".'),
        allow_only_one_tag: z.boolean().describe('Whether only one label may be applied to events for the project.')
    })
    .describe('A Timely project, the account-scoped container that time entries are logged against.');

const ProviderProjectSchema = ProjectSchema.extend({
    id: z.number()
});

const ProviderProjectListSchema = z.array(ProviderProjectSchema);

const AccountSchema = z.object({
    id: z.number(),
    name: z.string()
});

const AccountListSchema = z.array(AccountSchema);

const sync = createSync({
    description: 'Sync all projects in the account.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    models: {
        Project: ProjectSchema
    },

    exec: async (nango) => {
        // Timely's list endpoints have no working incremental filter: `updated_since` is silently
        // ignored (a future-dated value returns the full unfiltered list), so this sync must run as
        // a full refresh and use trackDeletes to detect projects removed from the account.
        const accountsConfig: ProxyConfiguration = {
            // Timely API docs: https://developer.timely.com/
            endpoint: '/1.1/accounts',
            retries: 3
        };
        const accountsResponse = await nango.get(accountsConfig);
        const accounts = AccountListSchema.parse(accountsResponse.data);
        const account = accounts[0];

        if (!account) {
            throw new Error('No Timely account is accessible for this connection.');
        }

        // Start delete tracking only after the prerequisite account lookup (which can throw) succeeds.
        await nango.trackDeletesStart('Project');

        const projectsConfig: ProxyConfiguration = {
            // Timely API docs: https://developer.timely.com/
            endpoint: `/1.1/${encodeURIComponent(String(account.id))}/projects`,
            retries: 3
        };
        const projectsResponse = await nango.get(projectsConfig);
        const projects = ProviderProjectListSchema.parse(projectsResponse.data);

        const records = projects.map((project) => ({
            ...project,
            id: String(project.id)
        }));

        if (records.length > 0) {
            await nango.batchSave(records, 'Project');
        }

        await nango.trackDeletesEnd('Project');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
