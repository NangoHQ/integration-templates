import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const TRAILING_WINDOW_DAYS = 7;
const DEFAULT_DAYS_BACK = 30;
const LIMIT = 100;

function formatDate(d: Date): string {
    const iso = d.toISOString();
    const idx = iso.indexOf('T');
    if (idx === -1) {
        throw new Error('Failed to format date');
    }
    return iso.slice(0, idx);
}

function subtractDays(dateStr: string, days: number): string {
    const d = new Date(dateStr);
    d.setUTCDate(d.getUTCDate() - days);
    return formatDate(d);
}

const ProviderTimeEntrySchema = z
    .object({
        uuid: z.string(),
        employee_id: z.string(),
        type: z.string(),
        clock_in_time: z.string().nullable(),
        clock_out_time: z.string().nullable(),
        worked_minutes: z.number().nullable(),
        is_active: z.boolean(),
        note: z.string().nullable(),
        timezone: z.string()
    })
    .passthrough();

const TimeEntrySchema = z.object({
    id: z.string().describe('UUID of the time entry'),
    employee_id: z.string().describe('SPI key of the employee'),
    type: z.string().describe('Entry type: time-entry, clock-in, clock-out, ergani-clock-in, or ergani-clock-out'),
    clock_in_time: z.string().optional().describe('ISO 8601 clock-in timestamp in UTC'),
    clock_out_time: z.string().optional().describe('ISO 8601 clock-out timestamp in UTC'),
    worked_minutes: z.number().optional().describe('Duration in minutes'),
    is_active: z.boolean().describe('True if this is the currently running clock entry'),
    note: z.string().optional().describe('Optional note attached to the entry'),
    timezone: z.string().describe('IANA timezone resolved for the timesheet')
});

const CheckpointSchema = z.object({
    from_date: z.string()
});

const sync = createSync({
    description: 'Sync time-tracking clock-in/clock-out entries.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        TimeEntry: TimeEntrySchema
    },

    exec: async (nango) => {
        const rawCheckpoint = await nango.getCheckpoint();
        const checkpoint = CheckpointSchema.parse(rawCheckpoint ?? { from_date: '' });
        const today = formatDate(new Date());
        const sweepTo = today;
        const sweepFrom = checkpoint.from_date ? subtractDays(checkpoint.from_date, TRAILING_WINDOW_DAYS) : subtractDays(today, DEFAULT_DAYS_BACK);

        const proxyConfig: ProxyConfiguration = {
            // https://workable.readme.io/reference/time-tracking-list-entries
            endpoint: '/spi/v3/time-tracking/time-entries',
            params: {
                from_date: sweepFrom,
                to_date: sweepTo
            },
            paginate: {
                type: 'offset',
                offset_name_in_request: 'offset',
                offset_start_value: 0,
                offset_calculation_method: 'by-response-size',
                limit_name_in_request: 'limit',
                limit: LIMIT,
                response_path: 'time_entries'
            },
            retries: 3
        };

        // Always restart the overlap window from page 1. Persisting an offset can
        // skip edited rows that move within the re-swept date range.
        for await (const page of nango.paginate(proxyConfig)) {
            const entries = page.map((record) => {
                const parsed = ProviderTimeEntrySchema.safeParse(record);
                if (!parsed.success) {
                    throw new Error(`Failed to parse time entry: ${parsed.error.message}`);
                }
                const data = parsed.data;
                return {
                    id: data.uuid,
                    employee_id: data.employee_id,
                    type: data.type,
                    ...(data.clock_in_time != null && { clock_in_time: data.clock_in_time }),
                    ...(data.clock_out_time != null && { clock_out_time: data.clock_out_time }),
                    ...(data.worked_minutes != null && { worked_minutes: data.worked_minutes }),
                    is_active: data.is_active,
                    ...(data.note != null && { note: data.note }),
                    timezone: data.timezone
                };
            });

            if (entries.length > 0) {
                await nango.batchSave(entries, 'TimeEntry');
            }
        }

        await nango.saveCheckpoint({
            from_date: sweepTo
        });
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
