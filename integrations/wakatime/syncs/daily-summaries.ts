import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const INITIAL_WINDOW_DAYS = 30;
const LOOKBACK_DAYS = 2;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const TotalsSchema = z.object({
    digital: z.string().optional().describe('Coding activity for the day in digital clock format (for example "1:23").'),
    hours: z.number().optional().describe('Whole hours portion of the coding activity for the day.'),
    minutes: z.number().optional().describe('Minutes portion of the coding activity for the day, after subtracting whole hours.'),
    text: z.string().optional().describe('Human-readable coding activity for the day (for example "1 hr 23 mins").'),
    total_seconds: z.number().optional().describe('Total coding activity for the day, in seconds.')
});

const BreakdownSchema = z.object({
    name: z.string().describe('Name of the language, project, or category.'),
    total_seconds: z.number().optional().describe('Total coding activity attributed to this entry, in seconds.'),
    percent: z.number().optional().describe('Percentage of the day total coding activity attributed to this entry.'),
    digital: z.string().optional().describe('Coding activity for this entry in digital clock format.'),
    text: z.string().optional().describe('Human-readable coding activity for this entry.'),
    hours: z.number().optional().describe('Whole hours portion of the coding activity for this entry.'),
    minutes: z.number().optional().describe('Minutes portion of the coding activity for this entry.'),
    seconds: z.number().optional().describe('Seconds portion of the coding activity for this entry.')
});

const DailySummarySchema = z
    .object({
        id: z.string().describe('Stable record id: the calendar date (YYYY-MM-DD) the summary covers.'),
        date: z.string().describe('Calendar date the summary covers, in YYYY-MM-DD format, in the user timezone.'),
        start: z.string().optional().describe('Start of the covered day as an ISO 8601 UTC datetime.'),
        end: z.string().optional().describe('End of the covered day as an ISO 8601 UTC datetime.'),
        text: z.string().optional().describe('Human-readable label for the covered day (for example "Today").'),
        timezone: z.string().optional().describe('Olson timezone used to compute the day boundaries.'),
        grand_total: TotalsSchema.optional().describe('Aggregate coding activity for the entire day across all breakdowns.'),
        categories: z.array(BreakdownSchema).optional().describe('Per-category breakdown of the day coding activity (for example Coding, Debugging).'),
        projects: z.array(BreakdownSchema).optional().describe('Per-project breakdown of the day coding activity.'),
        languages: z.array(BreakdownSchema).optional().describe('Per-language breakdown of the day coding activity.')
    })
    .describe('A single day of coding activity for the connected WakaTime user, including grand totals and language, project, and category breakdowns.');

const CheckpointSchema = z.object({
    last_synced_date: z.string()
});

const ProviderDaySchema = z.object({
    grand_total: TotalsSchema.optional(),
    categories: z.array(BreakdownSchema).optional(),
    projects: z.array(BreakdownSchema).optional(),
    languages: z.array(BreakdownSchema).optional(),
    range: z.object({
        date: z.string(),
        start: z.string().optional(),
        end: z.string().optional(),
        text: z.string().optional(),
        timezone: z.string().optional()
    })
});

const ProviderSummariesSchema = z.object({
    data: z.array(ProviderDaySchema)
});

function formatDate(date: Date): string {
    return date.toISOString().slice(0, 10);
}

function shiftDate(dateString: string, days: number): string {
    const date = new Date(`${dateString}T00:00:00.000Z`);
    date.setUTCDate(date.getUTCDate() + days);
    return formatDate(date);
}

const sync = createSync({
    description: 'Syncs per-day coding-activity summaries (grand totals plus language, project, and category breakdowns) over a rolling date window.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    scopes: ['read_summaries'],
    models: {
        DailySummary: DailySummarySchema
    },

    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint();

        const now = new Date();
        const today = formatDate(now);
        // Summary days are bounded in the account's timezone, so accounts ahead of UTC are already on the
        // next day. Request through tomorrow (UTC) and drop any day that has not started yet locally.
        const endDate = shiftDate(today, 1);
        const lastSynced = checkpoint?.last_synced_date;

        // Re-fetch a lookback buffer of recent days on every run because today is
        // still accumulating activity and WakaTime's stats pipeline is asynchronous.
        const startDate =
            lastSynced && DATE_PATTERN.test(lastSynced) && lastSynced <= endDate
                ? shiftDate(lastSynced, -LOOKBACK_DAYS)
                : shiftDate(today, -INITIAL_WINDOW_DAYS);

        const proxyConfig: ProxyConfiguration = {
            // https://wakatime.com/developers#summaries
            endpoint: '/api/v1/users/current/summaries',
            params: {
                start: startDate,
                end: endDate
            },
            retries: 3
        };

        const response = await nango.get<unknown>(proxyConfig);
        const parsed = ProviderSummariesSchema.parse(response.data);

        const startedDays = parsed.data.filter((day) =>
            day.range.start != null ? new Date(day.range.start).getTime() <= now.getTime() : day.range.date <= today
        );

        const records = startedDays.map((day) => ({
            id: day.range.date,
            date: day.range.date,
            ...(day.range.start != null && { start: day.range.start }),
            ...(day.range.end != null && { end: day.range.end }),
            ...(day.range.text != null && { text: day.range.text }),
            ...(day.range.timezone != null && { timezone: day.range.timezone }),
            ...(day.grand_total != null && { grand_total: day.grand_total }),
            ...(day.categories != null && { categories: day.categories }),
            ...(day.projects != null && { projects: day.projects }),
            ...(day.languages != null && { languages: day.languages })
        }));

        if (records.length > 0) {
            await nango.batchSave(records, 'DailySummary');
        }

        const lastStartedDate = startedDays.reduce((latest, day) => (day.range.date > latest ? day.range.date : latest), today);
        await nango.saveCheckpoint({ last_synced_date: lastStartedDate });
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
