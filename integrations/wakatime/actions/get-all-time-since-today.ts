import { z } from 'zod';
import { createAction } from 'nango';

const RangeSchema = z.object({
    start: z.string().describe('Start of the range as an ISO 8601 UTC datetime. Example: "2026-10-06T21:00:00Z"'),
    start_date: z.string().describe('Day the account was created in YYYY-MM-DD format. Example: "2026-10-07"'),
    start_text: z.string().describe('Day the account was created in human-readable format. Example: "Wed Oct 7th 2026"'),
    end: z.string().describe('End of the range (end of today) as an ISO 8601 UTC datetime. Example: "2026-10-10T20:59:59Z"'),
    end_date: z.string().describe('Today in YYYY-MM-DD format. Example: "2026-10-10"'),
    end_text: z.string().describe('Today in human-readable format. Example: "Today"'),
    timezone: z.string().describe('Timezone used for the range in Olson Country/Region format. Example: "Africa/Nairobi"')
});

const AllTimeStatsSchema = z.object({
    total_seconds: z.number().optional().describe('Total number of seconds logged since the account was created; omitted while still calculating. Example: 0'),
    text: z.string().optional().describe('Total time logged since the account was created, in human-readable form. Example: "0 secs"'),
    decimal: z.string().optional().describe('Total coding activity in decimal hours, as a string. Example: "0.00"'),
    digital: z.string().optional().describe('Total coding activity in digital clock format. Example: "0:00"'),
    daily_average: z.number().optional().describe('Average coding activity per day in seconds across the range; omitted while still calculating. Example: 0'),
    is_up_to_date: z.boolean().describe('Whether the totals are fully calculated; false means they are still being refreshed and may be incomplete'),
    percent_calculated: z.number().optional().describe("How complete the calculation is, from 0 to 100, where 100 includes today's activity"),
    range: RangeSchema.optional().describe('The date range the totals cover, from account creation through today'),
    timeout: z.number().optional().describe('Keystroke timeout setting in minutes used to join heartbeats into durations')
});

const OutputSchema = AllTimeStatsSchema.extend({
    message: z.string().optional().describe('Explanatory message from WakaTime, present when the stats are still being calculated')
}).describe("The user's total coding time since the account was created, plus calculation status.");

const ProviderStatsSchema = z.object({
    total_seconds: z.number().nullish(),
    text: z.string().nullish(),
    decimal: z.string().nullish(),
    digital: z.string().nullish(),
    daily_average: z.number().nullish(),
    is_up_to_date: z.boolean(),
    percent_calculated: z.number().nullish(),
    range: RangeSchema.nullish(),
    timeout: z.number().nullish(),
    message: z.string().nullish()
});

// The calculating message is not in the documented example, so accept it both inside data and on the envelope.
const ProviderResponseSchema = z.object({
    data: ProviderStatsSchema,
    message: z.string().nullish()
});

/**
 * @tags: [read]
 * @tagReason: Reads the user's all-time coding totals from WakaTime; it does not create, modify, or delete any provider data.
 * @pitfalls: WakaTime computes stats asynchronously, so is_up_to_date can be false and percent_calculated below 100 (with an optional message) while totals are still incomplete - surface that as a "still calculating" state rather than treating the values as final.
 */
const action = createAction({
    description: 'Get the total coding time logged since the account was created, up through today.',
    version: '1.0.0',
    input: z.object({}).describe('This action takes no input parameters.'),
    output: OutputSchema,
    scopes: ['read_stats'],

    exec: async (nango): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://wakatime.com/developers#all_time_since_today
            endpoint: '/api/v1/users/current/all_time_since_today',
            retries: 3
        });

        const parsed = ProviderResponseSchema.parse(response.data);

        const stats = parsed.data;
        const message = stats.message ?? parsed.message;

        return {
            is_up_to_date: stats.is_up_to_date,
            ...(stats.total_seconds != null && { total_seconds: stats.total_seconds }),
            ...(stats.text != null && { text: stats.text }),
            ...(stats.decimal != null && { decimal: stats.decimal }),
            ...(stats.digital != null && { digital: stats.digital }),
            ...(stats.daily_average != null && { daily_average: stats.daily_average }),
            ...(stats.percent_calculated != null && { percent_calculated: stats.percent_calculated }),
            ...(stats.range != null && { range: stats.range }),
            ...(stats.timeout != null && { timeout: stats.timeout }),
            ...(message != null && { message })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
