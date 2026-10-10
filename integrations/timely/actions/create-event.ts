import { z } from 'zod';
import { createAction } from 'nango';

const DurationSchema = z.object({
    hours: z.number().describe('Whole hours portion of the logged duration.'),
    minutes: z.number().describe('Whole minutes portion of the logged duration.'),
    seconds: z.number().describe('Whole seconds portion of the logged duration.'),
    formatted: z.string().describe('Duration formatted as HH:MM.'),
    total_hours: z.number().describe('Total logged duration expressed in decimal hours.'),
    total_seconds: z.number().describe('Total logged duration expressed in seconds.'),
    total_minutes: z.number().describe('Total logged duration expressed in minutes.')
});

const CostSchema = z.object({
    fractional: z.number().describe('Cost in the currency smallest unit, e.g. cents.'),
    formatted: z.string().describe('Cost formatted for display, including the currency symbol.'),
    amount: z.number().describe('Cost amount in the account currency.'),
    currency_code: z.string().describe('ISO 4217 code of the cost currency.')
});

const EventProjectSchema = z.object({
    id: z.number().describe('ID of the project the time was logged against.'),
    name: z.string().describe('Name of the project.'),
    color: z.string().describe('Project color as a hex code without a leading hash.'),
    rate_type: z.string().describe('Billing rate type of the project, e.g. "non-billable".'),
    billable: z.boolean().describe('Whether the project is billable.'),
    active: z.boolean().describe('Whether the project is active.')
});

const EventUserSchema = z.object({
    id: z.number().describe('ID of the user who logged the time.'),
    email: z.string().describe('Email address of the user.'),
    name: z.string().describe('Display name of the user.')
});

const InputSchema = z
    .object({
        account_id: z.number().int().positive().describe('Timely account ID. Discover it with the list-accounts action. Example: 1145787'),
        day: z
            .string()
            .regex(/^\d{4}-\d{2}-\d{2}$/)
            .describe('Day the time is logged for, formatted as YYYY-MM-DD.'),
        project_id: z
            .number()
            .int()
            .positive()
            .describe('ID of the project to log time against. Required: omitting it makes Timely silently log against an arbitrary default project.'),
        hours: z.number().int().min(0).optional().describe('Whole hours to log. Omit to log zero hours.'),
        minutes: z.number().int().min(0).max(59).optional().describe('Whole minutes to log, between 0 and 59. Omit to log zero minutes.'),
        note: z.string().optional().describe('Optional free-text note attached to the time entry.')
    })
    .describe('A time entry to log against a project in a Timely account.');

const OutputSchema = z
    .object({
        id: z.number().describe('Unique ID of the created time entry.'),
        uid: z.string().describe('Stable unique string identifier of the time entry.'),
        day: z.string().describe('Day the time was logged for, formatted as YYYY-MM-DD.'),
        note: z.string().nullable().describe('Note attached to the time entry, or null when none was provided.'),
        duration: DurationSchema.describe('Logged duration broken down into its components and totals.'),
        project: EventProjectSchema.describe('Project the time entry was logged against.'),
        user: EventUserSchema.describe('User the time entry was logged by.'),
        label_ids: z.array(z.number()).describe('IDs of labels attached to the time entry.'),
        billable: z.boolean().describe('Whether the logged time is billable.'),
        billed: z.boolean().describe('Whether the logged time has already been billed.'),
        estimated: z.boolean().describe('Whether this is an estimated (planned) entry rather than actual time.'),
        hour_rate: z.number().describe('Hourly rate applied to the time entry.'),
        cost: CostSchema.describe('Cost calculated for the time entry.'),
        external_id: z.string().nullable().describe('External identifier set by an integration, or null when unset.'),
        created_at: z.number().describe('Unix timestamp in seconds when the entry was created.'),
        updated_at: z.number().describe('Unix timestamp in seconds when the entry was last updated.')
    })
    .describe('The time entry that Timely created.');

/**
 * @tags: [write]
 * @tagReason: Creates a new time entry (event) in Timely, a provider-side mutation.
 * @pitfalls: Omitting both `hours` and `minutes` (or passing 0) silently creates a zero-duration entry instead of returning an error, so a successful response does not guarantee any time was actually logged.
 */
const action = createAction({
    description: 'Log a new time entry against a project.',
    version: '1.0.0',
    scopes: ['manage'],
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // Timely API docs: https://developer.timely.com/ (endpoint confirmed against the live API)
        const response = await nango.post({
            endpoint: `/1.1/${input.account_id}/events`,
            data: {
                event: {
                    day: input.day,
                    project_id: input.project_id,
                    ...(input.hours !== undefined && { hours: input.hours }),
                    ...(input.minutes !== undefined && { minutes: input.minutes }),
                    ...(input.note !== undefined && { note: input.note })
                }
            },
            // Creating a time entry is not idempotent; a retry after a lost response would log the time twice.
            // eslint-disable-next-line @nangohq/custom-integrations-linting/proxy-call-retries
            retries: 0
        });

        return OutputSchema.parse(response.data);
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
