import { z } from 'zod';
import { createAction } from 'nango';

const DurationSchema = z.object({
    hours: z.number().describe('Whole hours component of the duration.'),
    minutes: z.number().describe('Whole minutes component of the duration.'),
    seconds: z.number().describe('Whole seconds component of the duration.'),
    formatted: z.string().describe('Human-readable duration in HH:MM form, e.g. "01:30".'),
    total_hours: z.number().describe('Duration expressed as decimal hours, e.g. 1.5.'),
    total_seconds: z.number().describe('Duration expressed in seconds.'),
    total_minutes: z.number().describe('Duration expressed in minutes.')
});

const CostSchema = z.object({
    fractional: z.number().describe('Cost in the smallest currency unit (e.g. cents).'),
    formatted: z.string().describe('Human-readable cost including the currency symbol, e.g. "KSh0.00".'),
    amount: z.number().describe('Cost amount in the account currency.'),
    currency_code: z.string().describe('ISO code of the currency the cost is expressed in.')
});

const EventUserSchema = z.object({
    id: z.number().describe('ID of the user the time entry belongs to.'),
    email: z.string().describe('Email address of the user.'),
    name: z.string().describe('Display name of the user.'),
    updated_at: z.string().describe('Timestamp when the user record was last updated.')
});

const EventClientSchema = z.object({
    id: z.number().describe('Client ID.'),
    name: z.string().describe('Client name.'),
    color: z.string().describe('Hex color code assigned to the client.'),
    active: z.boolean().describe('Whether the client is active.'),
    external_id: z.string().nullable().describe('External identifier of the client, if set.'),
    updated_at: z.string().describe('Timestamp when the client was last updated.')
});

const EventProjectSchema = z.object({
    id: z.number().describe('ID of the project the time entry is logged against.'),
    name: z.string().describe('Name of the project.'),
    account_id: z.number().describe('ID of the account the project belongs to.'),
    active: z.boolean().describe('Whether the project is active.'),
    color: z.string().describe('Hex color code assigned to the project.'),
    rate_type: z.string().describe('Billing rate type of the project, e.g. "non-billable".'),
    billable: z.boolean().describe('Whether the project is billable.'),
    description: z.string().nullable().describe('Description of the project, if any.'),
    external_id: z.string().nullable().describe('External identifier of the project, if set.'),
    enable_labels: z.string().describe('Label mode of the project, e.g. "none" or "all".'),
    required_labels: z.boolean().describe('Whether entries on the project require labels.'),
    required_notes: z.boolean().describe('Whether entries on the project require notes.'),
    label_ids: z.array(z.number()).describe('IDs of labels enabled for the project.'),
    created_at: z.number().describe('Unix timestamp when the project was created.'),
    updated_at: z.number().describe('Unix timestamp when the project was last updated.'),
    client: EventClientSchema.nullable().describe('Client the project belongs to, or null when the project has no client.')
});

const InputSchema = z
    .object({
        account_id: z.number().int().describe('Timely account ID. Discover it with the list-accounts action. Example: 1145787'),
        event_id: z.number().int().describe('ID of the logged time entry (event) to retrieve. Example: 297121928')
    })
    .describe('Identifies the Timely account and the logged time entry to retrieve.');

const OutputSchema = z
    .object({
        id: z.number().describe('Unique ID of the time entry.'),
        uid: z.string().describe('Stable unique identifier of the time entry.'),
        day: z.string().describe('Day the time was logged for, in YYYY-MM-DD format.'),
        note: z.string().nullable().describe('Free-text note attached to the entry, if any.'),
        duration: DurationSchema.describe('Duration actually logged for the entry.'),
        estimated_duration: DurationSchema.describe('Estimated duration for the entry.'),
        cost: CostSchema.describe('Cost of the logged time.'),
        estimated_cost: CostSchema.describe('Estimated cost of the entry.'),
        internal_cost: CostSchema.describe('Internal cost of the logged time.'),
        estimated_internal_cost: CostSchema.describe('Estimated internal cost of the entry.'),
        project: EventProjectSchema.describe('Project the time entry is logged against.'),
        user: EventUserSchema.describe('User the time entry belongs to.'),
        label_ids: z.array(z.number()).describe('IDs of labels attached to the entry.'),
        user_ids: z.array(z.number()).describe('IDs of additional users associated with the entry.'),
        billable: z.boolean().describe('Whether the logged time is billable.'),
        billed: z.boolean().describe('Whether the logged time has been billed.'),
        locked: z.boolean().describe('Whether the entry is locked from editing.'),
        locked_reason: z.string().nullable().describe('Reason the entry is locked, if any.'),
        estimated: z.boolean().describe('Whether the entry is an estimate rather than actual time.'),
        timer_state: z.string().describe('State of the timer for the entry, e.g. "default".'),
        timer_started_on: z.number().describe('Unix timestamp when the timer was started, or 0 when not started.'),
        timer_stopped_on: z.number().describe('Unix timestamp when the timer was stopped, or 0 when not stopped.'),
        created_at: z.number().describe('Unix timestamp when the entry was created.'),
        updated_at: z.number().describe('Unix timestamp when the entry was last updated.'),
        created_from: z.string().describe('Source the entry was created from, e.g. "Web" or "Nango".'),
        updated_from: z.string().describe('Source the entry was last updated from.'),
        creator_id: z.number().describe('ID of the user who created the entry.'),
        updater_id: z.number().describe('ID of the user who last updated the entry.'),
        external_id: z.string().nullable().describe('External identifier of the entry, if set.'),
        entry_ids: z.array(z.number()).describe('IDs of related entries.'),
        suggestion_id: z.number().nullable().describe('ID of the suggestion the entry was created from, if any.'),
        autosheet_proposal_id: z.number().nullable().describe('ID of the autosheet proposal the entry was created from, if any.'),
        draft: z.boolean().describe('Whether the entry is a draft.'),
        manage: z.boolean().describe('Whether the caller may manage the entry.'),
        forecast_id: z.number().nullable().describe('ID of the forecast the entry belongs to, if any.'),
        billed_at: z.string().nullable().describe('Timestamp when the entry was billed, if billed.'),
        external_link_ids: z.array(z.number()).describe('IDs of external links attached to the entry.'),
        hour_rate: z.number().describe('Hourly rate applied to the entry.'),
        hour_rate_in_cents: z.number().describe('Hourly rate applied to the entry, in cents.'),
        internal_cost_rate: z.number().describe('Internal cost rate applied to the entry.'),
        profit: z.number().describe('Profit derived from the entry.'),
        profitability: z.number().describe('Profitability ratio of the entry.'),
        invoice_id: z.number().nullable().describe('ID of the invoice the entry was billed on, if any.'),
        sequence: z.number().describe('Ordering sequence of the entry within its day.'),
        deleted: z.boolean().describe('Whether the entry has been deleted.'),
        to: z.unknown().describe('End timestamp of the entry when it represents a timer range; otherwise null.'),
        from: z.unknown().describe('Start timestamp of the entry when it represents a timer range; otherwise null.')
    })
    .describe('A single Timely logged time entry (event), including its duration, project, and user.');

/**
 * @tags: [read]
 * @tagReason: Reads a single logged time entry (event) from Timely without modifying any provider data.
 * @pitfalls: A nonexistent or already-deleted event_id fails with a 404 rather than returning an empty result.
 */
const action = createAction({
    description: 'Retrieve a single logged time entry by ID.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // Timely API reference: https://developer.timely.com/ (docs portal is login-walled; endpoint confirmed live)
            endpoint: `/1.1/${encodeURIComponent(String(input.account_id))}/events/${encodeURIComponent(String(input.event_id))}`,
            retries: 3
        });

        return OutputSchema.parse(response.data);
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
