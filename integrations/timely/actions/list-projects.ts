import { z } from 'zod';
import { createAction } from 'nango';

const CurrencySchema = z.object({
    id: z.string().describe('Currency identifier. Example: "kes"'),
    name: z.string().describe('Display name of the currency. Example: "Kenyan Shilling"'),
    iso_code: z.string().describe('ISO 4217 currency code. Example: "KES"'),
    symbol: z.string().describe('Currency symbol. Example: "KSh"'),
    symbol_first: z.boolean().describe('Whether the symbol is displayed before the amount.')
});

const DurationSchema = z.object({
    hours: z.number().describe('Whole hours component of the duration.'),
    minutes: z.number().describe('Whole minutes component of the duration.'),
    seconds: z.number().describe('Seconds component of the duration.'),
    formatted: z.string().describe('Human-readable duration. Example: "01:30"'),
    total_hours: z.number().describe('Total duration expressed in hours. Example: 1.5'),
    total_seconds: z.number().describe('Total duration expressed in seconds.'),
    total_minutes: z.number().describe('Total duration expressed in minutes.')
});

const CostSchema = z.object({
    fractional: z.number().describe('Cost amount in the smallest currency unit (e.g. cents).'),
    formatted: z.string().describe('Human-readable cost amount. Example: "KSh0.00"'),
    amount: z.number().describe('Cost amount in the major currency unit.'),
    currency_code: z.string().describe('ISO currency code for the cost. Example: "kes"')
});

const ClientSchema = z.object({
    id: z.number().describe('Client ID. Example: 2193170'),
    name: z.string().describe('Client name. Example: "Nango Developer"'),
    color: z.string().describe('Client color as a hex code without the leading "#". Example: "1976d2"'),
    active: z.boolean().describe('Whether the client is active.'),
    external_id: z.string().nullable().optional().describe('External ID assigned by an integrating system, if any.'),
    updated_at: z.string().nullable().optional().describe('ISO 8601 timestamp of the last client update.')
});

const ProjectUserSchema = z.object({
    user_id: z.number().describe('ID of a user assigned to the project. Example: 2418691'),
    hour_rate: z.number().describe('Billable hourly rate for this user on the project.'),
    hour_rate_in_cents: z.number().describe('Billable hourly rate for this user in cents.'),
    internal_hour_rate: z.number().describe('Internal (cost) hourly rate for this user on the project.'),
    internal_hour_rate_in_cents: z.number().describe('Internal (cost) hourly rate for this user in cents.'),
    deleted: z.boolean().describe('Whether the user assignment is marked deleted.'),
    created_at: z.string().describe('ISO 8601 timestamp when the user was assigned.'),
    updated_at: z.string().describe('ISO 8601 timestamp when the user assignment was last updated.')
});

const ProjectSchema = z.object({
    id: z.number().describe('Project ID. Example: 5691496'),
    active: z.boolean().describe('Whether the project is active.'),
    account_id: z.number().describe('ID of the account the project belongs to. Example: 1145787'),
    name: z.string().describe('Project name. Example: "Meetings & Collaboration"'),
    description: z.string().nullable().optional().describe('Project description.'),
    color: z.string().nullable().optional().describe('Project color as a hex code without the leading "#", or null when unset. Example: "ffeb3b"'),
    rate_type: z.string().describe('How the project is billed. Example: "non-billable"'),
    billable: z.boolean().describe('Whether the project is billable.'),
    created_at: z.number().describe('Unix timestamp (seconds) when the project was created.'),
    updated_at: z.number().describe('Unix timestamp (seconds) when the project was last updated.'),
    client: ClientSchema.nullable().optional().describe('Client the project belongs to, if any.'),
    enable_labels: z.string().describe('Label mode for the project, e.g. "none" or "all".'),
    currency: CurrencySchema.describe('Currency configured for the project.'),
    label_ids: z.array(z.number()).describe('IDs of labels associated with the project.'),
    users: z.array(ProjectUserSchema).describe('Users assigned to the project with their project-specific rates.'),
    duration: DurationSchema.describe('All-time duration logged against the project (aggregate, not date-scoped).'),
    cost: CostSchema.describe('All-time cost logged against the project (aggregate, not date-scoped).')
});

const InputSchema = z
    .object({
        account_id: z.number().int().positive().describe('Timely account ID. Example: 1145787')
    })
    .describe('Input for listing all projects in a Timely account.');

const OutputSchema = z
    .object({
        projects: z.array(ProjectSchema).describe('All projects visible in the account.'),
        count: z.number().describe('Number of projects returned.')
    })
    .describe('The projects visible in the requested Timely account.');

/**
 * @tags: [read]
 * @tagReason: Reads the account's projects from the provider without modifying any data.
 * @pitfalls: Each project's duration and cost are all-time aggregates and cannot be scoped to a date range, and the action returns the entire project list in one unpaginated response, so accounts with many projects can yield a large payload.
 */
const action = createAction({
    description: 'List all projects in a Timely account.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // Timely API: GET /1.1/{account_id}/projects
            // Provider docs (https://developer.timely.com/) are login-gated; endpoint verified live.
            endpoint: `/1.1/${input.account_id}/projects`,
            retries: 3
        });

        const projects = z.array(ProjectSchema).parse(response.data);

        return {
            projects,
            count: projects.length
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
