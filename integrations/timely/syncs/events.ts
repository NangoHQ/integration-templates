import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const AccountSchema = z.object({
    id: z.number()
});

const AccountsResponseSchema = z.array(AccountSchema);

const ProviderUserSchema = z.object({
    id: z.number(),
    email: z.string(),
    name: z.string()
});

const ProviderClientSchema = z.object({
    id: z.number(),
    name: z.string()
});

const ProviderProjectSchema = z.object({
    id: z.number(),
    name: z.string(),
    client: ProviderClientSchema.nullable().optional()
});

const ProviderDurationSchema = z.object({
    hours: z.number(),
    minutes: z.number(),
    seconds: z.number(),
    formatted: z.string(),
    total_hours: z.number()
});

const ProviderCostSchema = z.object({
    amount: z.number(),
    currency_code: z.string()
});

const ProviderEventSchema = z.object({
    id: z.number(),
    uid: z.string(),
    user: ProviderUserSchema,
    project: ProviderProjectSchema,
    duration: ProviderDurationSchema,
    estimated_duration: ProviderDurationSchema,
    cost: ProviderCostSchema,
    day: z.string(),
    note: z.string().nullable().optional(),
    billable: z.boolean(),
    billed: z.boolean(),
    billed_at: z.string().nullable().optional(),
    hour_rate: z.number(),
    external_id: z.string().nullable().optional(),
    label_ids: z.array(z.number()),
    locked: z.boolean(),
    locked_reason: z.string().nullable().optional(),
    created_at: z.number(),
    updated_at: z.number(),
    created_from: z.string().nullable().optional(),
    updated_from: z.string().nullable().optional(),
    creator_id: z.number(),
    updater_id: z.number(),
    deleted: z.boolean()
});

const ProviderEventsResponseSchema = z.array(ProviderEventSchema);

const EventSchema = z
    .object({
        id: z.string().describe('Unique Timely event (time entry) identifier, rendered as a string.'),
        uid: z.string().describe('Timely-generated opaque unique identifier (hex string) for the event.'),
        user_id: z.number().describe('ID of the Timely user who logged the time entry.'),
        user_email: z.string().describe('Email address of the user who logged the time entry.'),
        user_name: z.string().describe('Display name of the user who logged the time entry.'),
        project_id: z.number().describe('ID of the project the time was logged against.'),
        project_name: z.string().describe('Name of the project the time was logged against.'),
        client_id: z.number().nullable().describe('ID of the client that owns the project, or null when the project has no client.'),
        client_name: z.string().nullable().describe('Name of the client that owns the project, or null when the project has no client.'),
        day: z.string().describe('Calendar day the time entry belongs to, formatted as YYYY-MM-DD.'),
        note: z.string().nullable().describe('Free-text note attached to the time entry, or null when none was provided.'),
        duration_hours: z.number().describe('Whole-hours component of the logged duration.'),
        duration_minutes: z.number().describe('Minutes component of the logged duration (0-59).'),
        duration_seconds: z.number().describe('Seconds component of the logged duration (0-59).'),
        duration_total_hours: z.number().describe('Total logged duration expressed in decimal hours (e.g. 1.5 for 1h30m).'),
        duration_formatted: z.string().describe('Total logged duration formatted as HH:MM.'),
        estimated_duration_total_hours: z.number().describe('Estimated duration for the entry in decimal hours, or 0 when no estimate exists.'),
        billable: z.boolean().describe('Whether the time entry is billable to the client.'),
        billed: z.boolean().describe('Whether the time entry has already been billed.'),
        billed_at: z.string().nullable().describe('Timestamp at which the entry was billed, or null when not yet billed.'),
        cost_amount: z.number().describe('Monetary cost amount recorded for the time entry.'),
        cost_currency_code: z.string().describe('ISO currency code (lowercase) in which the cost amount is expressed.'),
        hour_rate: z.number().describe('Hourly rate applied to the time entry.'),
        external_id: z.string().nullable().describe('Caller-supplied external identifier for the entry, or null when unset.'),
        label_ids: z.array(z.number()).describe('IDs of the labels attached to the time entry.'),
        locked: z.boolean().describe('Whether the time entry is locked against further edits.'),
        locked_reason: z.string().nullable().describe('Reason the time entry is locked, or null when it is not locked.'),
        created_at: z.number().describe('Unix timestamp (seconds) at which the event was created.'),
        updated_at: z.number().describe('Unix timestamp (seconds) at which the event was last updated.'),
        created_from: z.string().nullable().describe('Source that created the event (e.g. Web, Nango), or null when unknown.'),
        updated_from: z.string().nullable().describe('Source that last updated the event (e.g. Web, Nango), or null when unknown.'),
        creator_id: z.number().describe('ID of the user who created the event.'),
        updater_id: z.number().describe('ID of the user who last updated the event.'),
        deleted: z.boolean().describe('Whether Timely marks the event as deleted.')
    })
    .describe('A Timely time entry (event) logged within the configured day window.');

const MetadataSchema = z
    .object({
        since: z.string().describe('Inclusive start of the day window in YYYY-MM-DD format. Defaults to 90 days before the run date.').optional(),
        upto: z.string().describe('Inclusive end of the day window in YYYY-MM-DD format. Defaults to the run date.').optional()
    })
    .describe('Optional caller-configured day range for the events sync; omit it to sync the trailing 90 days.');

const CheckpointSchema = z.object({
    window_since: z.string().describe('Inclusive day at which the current full-refresh window started.'),
    window_upto: z.string().describe('Inclusive day at which the current full-refresh window ends.'),
    next_since: z.string().describe('Inclusive next day still needing to be fetched within the current full-refresh window.')
});

const DAY_IN_MS = 24 * 60 * 60 * 1000;
const DEFAULT_WINDOW_DAYS = 90;
const WINDOW_CHUNK_DAYS = 30;

function formatDay(date: Date): string {
    return date.toISOString().slice(0, 10);
}

function parseDay(day: string): Date {
    const date = new Date(`${day}T00:00:00.000Z`);

    if (Number.isNaN(date.getTime()) || formatDay(date) !== day) {
        throw new Error(`Invalid Timely day "${day}". Expected YYYY-MM-DD.`);
    }

    return date;
}

function addDays(day: string, days: number): string {
    const date = parseDay(day);
    date.setUTCDate(date.getUTCDate() + days);
    return formatDay(date);
}

function isAfterDay(left: string, right: string): boolean {
    return parseDay(left).getTime() > parseDay(right).getTime();
}

function earlierDay(left: string, right: string): string {
    return isAfterDay(left, right) ? right : left;
}

const sync = createSync({
    description:
        "Sync logged time entries ('events') within a bounded, caller-configurable day range - full refresh per window, since no working incremental filter exists.",
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    metadata: MetadataSchema,
    checkpoint: CheckpointSchema,
    models: {
        Event: EventSchema
    },

    exec: async (nango) => {
        // Timely still has no working incremental filter (`updated_since` is ignored), so this
        // remains a full refresh. The confirmed-working `since`/`upto` filters do, however,
        // let the sync resume an unfinished full-window sweep across executions by persisting the
        // next day slice that still needs to be fetched.
        const metadata = await nango.getMetadata<z.infer<typeof MetadataSchema>>();
        const checkpoint = await nango.getCheckpoint();

        const requestedUpto = metadata?.upto ?? formatDay(new Date());
        const requestedSince = metadata?.since ?? formatDay(new Date(Date.now() - DEFAULT_WINDOW_DAYS * DAY_IN_MS));
        const windowSince = checkpoint?.window_since ?? requestedSince;
        const windowUpto = checkpoint?.window_upto ?? requestedUpto;
        const chunkSince = checkpoint?.next_since ?? windowSince;

        if (isAfterDay(windowSince, windowUpto)) {
            throw new Error(`Invalid Timely events window: since (${windowSince}) must be on or before upto (${windowUpto}).`);
        }

        if (isAfterDay(chunkSince, windowUpto)) {
            throw new Error(`Invalid Timely events checkpoint: next_since (${chunkSince}) must be on or before window_upto (${windowUpto}).`);
        }

        const chunkUpto = earlierDay(addDays(chunkSince, WINDOW_CHUNK_DAYS - 1), windowUpto);

        // Every Timely resource except the account listing is scoped to an account id, so it
        // must be resolved before any delete tracking starts.
        const accountsConfig: ProxyConfiguration = {
            // https://developer.timely.com/
            endpoint: '/1.1/accounts',
            retries: 3
        };
        const accountsResponse = await nango.get<unknown>(accountsConfig);
        const accounts = AccountsResponseSchema.parse(accountsResponse.data);
        const account = accounts[0];
        if (!account) {
            throw new Error('No accessible Timely account was returned by GET /1.1/accounts for this connection.');
        }
        const accountId = encodeURIComponent(String(account.id));

        // Safe to call once the account id prerequisite above has resolved. Because the window
        // is a full refresh, events deleted at the provider disappear from the fetch and are
        // removed from the cache when the final chunk closes the delete-tracking window.
        // The cache is still scoped to this window: an event that falls out of it because the
        // caller narrows the range, or because the trailing default window advances, is removed
        // once the next full-window sweep for those bounds completes.
        await nango.trackDeletesStart('Event');

        const eventsConfig: ProxyConfiguration = {
            // https://developer.timely.com/
            endpoint: `/1.1/${accountId}/events`,
            params: {
                since: chunkSince,
                upto: chunkUpto
            },
            retries: 3
        };
        const eventsResponse = await nango.get<unknown>(eventsConfig);
        const providerEvents = ProviderEventsResponseSchema.parse(eventsResponse.data);

        const events = providerEvents.map((event) => ({
            id: String(event.id),
            uid: event.uid,
            user_id: event.user.id,
            user_email: event.user.email,
            user_name: event.user.name,
            project_id: event.project.id,
            project_name: event.project.name,
            client_id: event.project.client?.id ?? null,
            client_name: event.project.client?.name ?? null,
            day: event.day,
            note: event.note ?? null,
            duration_hours: event.duration.hours,
            duration_minutes: event.duration.minutes,
            duration_seconds: event.duration.seconds,
            duration_total_hours: event.duration.total_hours,
            duration_formatted: event.duration.formatted,
            estimated_duration_total_hours: event.estimated_duration.total_hours,
            billable: event.billable,
            billed: event.billed,
            billed_at: event.billed_at ?? null,
            cost_amount: event.cost.amount,
            cost_currency_code: event.cost.currency_code,
            hour_rate: event.hour_rate,
            external_id: event.external_id ?? null,
            label_ids: event.label_ids,
            locked: event.locked,
            locked_reason: event.locked_reason ?? null,
            created_at: event.created_at,
            updated_at: event.updated_at,
            created_from: event.created_from ?? null,
            updated_from: event.updated_from ?? null,
            creator_id: event.creator_id,
            updater_id: event.updater_id,
            deleted: event.deleted
        }));

        if (events.length > 0) {
            await nango.batchSave(events, 'Event');
        }

        if (isAfterDay(windowUpto, chunkUpto)) {
            await nango.saveCheckpoint({
                window_since: windowSince,
                window_upto: windowUpto,
                next_since: addDays(chunkUpto, 1)
            });
            // This is still the middle of a full refresh, so delete tracking stays open until
            // the last day slice has been fetched in a later execution.
            return;
        }

        await nango.trackDeletesEnd('Event');
        await nango.clearCheckpoint();
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
