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

const CheckpointSchema = z.object({
    page: z.number()
});

const sync = createSync({
    description: 'Sync ticket time entries from Freshdesk.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        TimeEntry: TimeEntrySchema
    },

    exec: async (nango) => {
        // Blocker: /api/v2/time_entries does not support an updated_after or changed-since filter,
        // and there is no deleted-record endpoint. Full refresh with a pagination checkpoint is used.
        const checkpoint = await nango.getCheckpoint();
        let page: number | undefined = checkpoint?.page ?? 1;

        const proxyConfig: ProxyConfiguration = {
            // https://developers.freshdesk.com/api/#list_all_time_entries
            endpoint: '/api/v2/time_entries',
            paginate: {
                type: 'offset',
                offset_name_in_request: 'page',
                offset_start_value: page ?? 1,
                offset_calculation_method: 'per-page',
                limit_name_in_request: 'per_page',
                limit: 100,
                on_page: async ({ nextPageParam }) => {
                    page = typeof nextPageParam === 'number' ? nextPageParam : undefined;
                }
            },
            retries: 3
        };

        for await (const pageResults of nango.paginate(proxyConfig)) {
            const parsedPage = z.array(ProviderTimeEntrySchema).safeParse(pageResults);
            if (!parsedPage.success) {
                throw new Error(`Failed to parse time entries page: ${parsedPage.error.message}`);
            }

            const timeEntries = parsedPage.data.map((data) => ({
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

            if (timeEntries.length > 0) {
                await nango.batchSave(timeEntries, 'TimeEntry');
            }

            if (page !== undefined) {
                await nango.saveCheckpoint({ page });
            }
        }

        await nango.clearCheckpoint();
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
