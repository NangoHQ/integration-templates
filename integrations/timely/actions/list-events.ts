import { z } from 'zod';
import { createAction } from 'nango';

const AccountSchema = z.object({
    id: z.number(),
    name: z.string().optional()
});

const DurationSchema = z.object({
    hours: z.number().describe('Whole hours component of the duration.'),
    minutes: z.number().describe('Minutes component of the duration.'),
    seconds: z.number().describe('Seconds component of the duration.'),
    formatted: z.string().describe('Duration formatted as HH:MM, e.g. "01:30".'),
    total_hours: z.number().describe('Total duration in decimal hours, e.g. 1.5.'),
    total_seconds: z.number().describe('Total duration in seconds.'),
    total_minutes: z.number().describe('Total duration in minutes.')
});

const MoneySchema = z.object({
    fractional: z.number().describe('Amount in the smallest currency unit (e.g. cents).'),
    formatted: z.string().describe('Amount formatted with its currency, e.g. "KSh0.00".'),
    amount: z.number().describe('Decimal amount.'),
    currency_code: z.string().describe('Currency code, e.g. "kes".')
});

const EventUserSchema = z.object({
    id: z.number().describe('Unique ID of the user the time entry is attributed to.'),
    email: z.string().optional().describe('Email address of the user.'),
    name: z.string().optional().describe('Display name of the user.')
});

const EventProjectSchema = z
    .object({
        id: z.number().describe('Unique ID of the project the time entry is logged against.'),
        name: z.string().optional().describe('Name of the project.'),
        account_id: z.number().optional().describe('ID of the account that owns the project.'),
        active: z.boolean().optional().describe('Whether the project is active.'),
        billable: z.boolean().optional().describe('Whether the project is billable.'),
        rate_type: z.string().optional().describe('Billing rate type of the project, e.g. "non-billable".'),
        color: z.string().optional().describe('Hex color code used to display the project.')
    })
    .passthrough();

const EventSchema = z
    .object({
        id: z.number().describe('Unique ID of the time entry.'),
        uid: z.string().describe('Stable unique identifier of the time entry.'),
        day: z.string().describe('Calendar day the time is logged against, formatted YYYY-MM-DD.'),
        note: z.string().nullable().describe('Free-text note attached to the time entry.'),
        user: EventUserSchema.describe('User the time entry is attributed to.'),
        project: EventProjectSchema.describe('Project the time entry is logged against.'),
        duration: DurationSchema.describe('Duration actually logged.'),
        estimated_duration: DurationSchema.describe('Estimated duration for the entry.'),
        cost: MoneySchema.describe('Computed cost of the entry.'),
        estimated_cost: MoneySchema.describe('Estimated cost of the entry.'),
        billable: z.boolean().describe('Whether the entry is billable.'),
        billed: z.boolean().describe('Whether the entry has been billed.'),
        estimated: z.boolean().describe('Whether the entry is an estimate rather than actual time.'),
        draft: z.boolean().describe('Whether the entry is still a draft.'),
        locked: z.boolean().describe('Whether the entry is locked from editing.'),
        locked_reason: z.string().nullable().describe('Reason the entry is locked, when locked.'),
        label_ids: z.array(z.number()).describe('IDs of labels attached to the entry.'),
        user_ids: z.array(z.number()).describe('IDs of additional users associated with the entry.'),
        from: z.string().nullable().describe('Start time of the entry, when it represents a time block.'),
        to: z.string().nullable().describe('End time of the entry, when it represents a time block.'),
        created_at: z.number().describe('Unix timestamp (seconds) when the entry was created.'),
        updated_at: z.number().describe('Unix timestamp (seconds) when the entry was last updated.'),
        created_from: z.string().describe('Source the entry was created from, e.g. "Web" or "Nango".'),
        updated_from: z.string().describe('Source the entry was last updated from.'),
        deleted: z.boolean().describe('Whether the entry has been deleted.'),
        hour_rate: z.number().describe('Hourly rate applied to the entry.'),
        external_id: z.string().nullable().describe('External identifier attached to the entry, when present.'),
        sequence: z.number().describe('Ordering sequence of the entry within its day.'),
        timer_state: z.string().describe('State of the entry timer, e.g. "default".')
    })
    .passthrough();

const InputSchema = z
    .object({
        account_id: z.number().int().positive().optional().describe('Timely account ID. Omit to use the single account available to this connection.'),
        since: z
            .string()
            .regex(/^\d{4}-\d{2}-\d{2}$/)
            .optional()
            .describe('Start day (inclusive) to filter entries by, formatted YYYY-MM-DD. Provide together with upto.'),
        upto: z
            .string()
            .regex(/^\d{4}-\d{2}-\d{2}$/)
            .optional()
            .describe('End day (inclusive) to filter entries by, formatted YYYY-MM-DD. Provide together with since.'),
        project_id: z
            .number()
            .int()
            .positive()
            .optional()
            .describe('Filter to entries logged against a single project ID (singular field; plural forms are ignored by Timely).'),
        user_id: z.number().int().positive().optional().describe('Filter to entries attributed to a single user ID.')
    })
    .describe('Filters for listing Timely time entries (events). All filters are optional.');

const OutputSchema = z
    .object({
        events: z.array(EventSchema).describe('Time entries matching the requested filters.')
    })
    .describe('Logged Timely time entries (events) matching the requested filters.');

/**
 * @tags: [read]
 * @tagReason: Only reads time entries from the provider; it never creates, updates, or deletes anything.
 * @pitfalls: Passing the plural `project_ids` or `updated_since` is silently ignored rather than rejected, so use singular `project_id` and do not expect incremental filtering. The day-range filter only applies when both `since` and `upto` are supplied; omitting them returns a limited default window rather than all history.
 */
const action = createAction({
    description: 'List logged time entries (Timely events), optionally filtered by day range and/or project.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['manage'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        let accountId = input.account_id;

        if (accountId === undefined) {
            // https://developer.timely.com/ (Timely API docs are login-walled; endpoint verified live)
            const accountsResponse = await nango.get({
                endpoint: '/1.1/accounts',
                retries: 3
            });

            const accounts = z.array(AccountSchema).parse(accountsResponse.data ?? []);
            const account = accounts[0];

            if (!account) {
                throw new nango.ActionError({
                    type: 'no_account',
                    message: 'No Timely account is available for this connection.'
                });
            }

            accountId = account.id;
        }

        // https://developer.timely.com/ (Timely API docs are login-walled; endpoint verified live)
        const response = await nango.get({
            endpoint: `/1.1/${encodeURIComponent(String(accountId))}/events`,
            params: {
                ...(input.since !== undefined && { since: input.since }),
                ...(input.upto !== undefined && { upto: input.upto }),
                ...(input.project_id !== undefined && { project_id: input.project_id }),
                ...(input.user_id !== undefined && { user_id: input.user_id })
            },
            retries: 3
        });

        const events = z.array(EventSchema).parse(response.data ?? []);

        return { events };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
