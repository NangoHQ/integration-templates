import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const ProviderTimeEntrySchema = z.object({
    id: z.number(),
    billable: z.boolean(),
    note: z.string().nullable(),
    timer_running: z.boolean(),
    agent_id: z.number(),
    ticket_id: z.number(),
    time_spent: z.string(),
    created_at: z.string(),
    updated_at: z.string(),
    executed_at: z.string(),
    start_time: z.string()
});

const TimeEntrySchema = z
    .object({
        id: z.string().describe('Unique identifier of the time entry as a stable string.'),
        billable: z.boolean().describe('Whether the time entry is billable.'),
        note: z.string().optional().describe('Optional note attached to the time entry.'),
        timer_running: z.boolean().describe('Indicates if the timer is currently running for this entry.'),
        agent_id: z.number().describe('Identifier of the agent who logged the time entry.'),
        ticket_id: z.number().describe('Identifier of the ticket associated with the time entry.'),
        time_spent: z.string().describe('Total time spent in HH:MM format.'),
        created_at: z.string().describe('UTC timestamp when the time entry was created.'),
        updated_at: z.string().describe('UTC timestamp when the time entry was last updated.'),
        executed_at: z.string().describe('UTC timestamp when the work for this entry was executed.'),
        start_time: z.string().describe('UTC timestamp when the timer was started.')
    })
    .describe('A ticket time entry logged by an agent in Freshdesk.');

function mapTimeEntries(pageResults: unknown[]): z.infer<typeof TimeEntrySchema>[] {
    const parsedPage = z.array(ProviderTimeEntrySchema).safeParse(pageResults);
    if (!parsedPage.success) {
        throw new Error(`Failed to parse time entries page: ${parsedPage.error.message}`);
    }

    return parsedPage.data.map((data) => ({
        id: String(data.id),
        billable: data.billable,
        ...(data.note != null && { note: data.note }),
        timer_running: data.timer_running,
        agent_id: data.agent_id,
        ticket_id: data.ticket_id,
        time_spent: data.time_spent,
        created_at: data.created_at,
        updated_at: data.updated_at,
        executed_at: data.executed_at,
        start_time: data.start_time
    }));
}

const sync = createSync({
    description: 'Sync ticket time entries from Freshdesk.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    models: {
        TimeEntry: TimeEntrySchema
    },

    // Blocker: /api/v2/time_entries does not support an updated_after or changed-since filter,
    // and there is no deleted-record endpoint, so this is a delete-tracked full refresh.
    // Delete-tracked syncs must always start from page 1 and complete a full enumeration per
    // Nango requirements, so there is no resumable checkpoint.
    exec: async (nango) => {
        const proxyConfig: ProxyConfiguration = {
            // https://developers.freshdesk.com/api/#list_all_time_entries
            endpoint: '/api/v2/time_entries',
            paginate: {
                type: 'offset',
                offset_name_in_request: 'page',
                offset_start_value: 1,
                offset_calculation_method: 'per-page',
                limit_name_in_request: 'per_page',
                limit: 100
            },
            retries: 3
        };

        const iterator = nango.paginate(proxyConfig);

        // Fetch and validate the first page before opening the delete-tracking window, so a
        // transient empty or invalid response can't wipe out previously-synced records. An empty
        // first page is inconclusive (it may be a transient provider glitch rather than a genuine
        // zero-record account), so skip this run entirely rather than opening a tracking window
        // that would delete every previously-synced record; the next scheduled run retries.
        const first = await iterator.next();
        if (first.done) {
            return;
        }
        const firstTimeEntries = mapTimeEntries(first.value);
        if (firstTimeEntries.length === 0) {
            return;
        }

        await nango.trackDeletesStart('TimeEntry');

        await nango.batchSave(firstTimeEntries, 'TimeEntry');

        let next = await iterator.next();
        while (!next.done) {
            const timeEntries = mapTimeEntries(next.value);
            if (timeEntries.length > 0) {
                await nango.batchSave(timeEntries, 'TimeEntry');
            }
            next = await iterator.next();
        }

        await nango.trackDeletesEnd('TimeEntry');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
