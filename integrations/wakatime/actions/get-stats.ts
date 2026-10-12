import { z } from 'zod';
import { createAction } from 'nango';

const BreakdownSchema = z
    .object({
        name: z.string().optional().describe('Breakdown entry name, such as a language, editor, operating system, project, category, dependency, or machine.'),
        total_seconds: z.number().optional().describe('Total coding time for this entry, in seconds.'),
        percent: z.number().optional().describe('Share of total coding time for this entry, as a percentage.'),
        digital: z.string().optional().describe('Coding time for this entry as a digital clock string, e.g. "1:23".'),
        text: z.string().optional().describe('Coding time for this entry as a human-readable string, e.g. "1 hr 23 mins".'),
        hours: z.number().optional().describe('Whole hours portion of coding time for this entry.'),
        minutes: z.number().optional().describe('Whole minutes portion of coding time for this entry.'),
        seconds: z.number().optional().describe('Whole seconds portion of coding time for this entry.'),
        machine_name_id: z.string().optional().describe('Unique identifier of the machine; only present for machine breakdown entries.')
    })
    .passthrough();

const BestDaySchema = z.object({
    date: z.string().optional().describe('Day with the most coding time, in YEAR-MONTH-DAY format.'),
    text: z.string().optional().describe('Total coding time on the best day as a human-readable string.'),
    total_seconds: z.number().optional().describe('Total coding time on the best day, in seconds.')
});

const AiModelBreakdownSchema = z.object({
    name: z.string().optional().describe('AI model name.'),
    lines: z.number().optional().describe('Number of lines added or removed by this AI model.'),
    cost: z.number().optional().describe('Estimated USD cost for this AI model.')
});

const InputSchema = z
    .object({
        range: z
            .string()
            .regex(/^(last_7_days|last_30_days|last_6_months|last_year|all_time|\d{4}(-(0[1-9]|1[0-2]))?)$/)
            .optional()
            .describe(
                'Time range for the stats: "last_7_days", "last_30_days", "last_6_months", "last_year", "all_time", a "YYYY" year, or a "YYYY-MM" month. Omit to use the account default range.'
            ),
        timeout: z
            .number()
            .int()
            .positive()
            .optional()
            .describe('Keystroke timeout in minutes used when joining heartbeats into durations. Only applied when range is set.'),
        writes_only: z.boolean().optional().describe('Calculate stats using only write-type coding activity. Only applied when range is set.')
    })
    .describe('Input for retrieving aggregate coding-activity stats for a given time range.');

const OutputSchema = z
    .object({
        id: z.string().optional().describe('Unique identifier of this stats record.'),
        user_id: z.string().optional().describe('Unique identifier of the user these stats belong to.'),
        range: z.string().optional().describe('Time range these stats cover, e.g. "last_7_days".'),
        start: z.string().optional().describe('Start of the time range as an ISO 8601 UTC datetime.'),
        end: z.string().optional().describe('End of the time range as an ISO 8601 UTC datetime.'),
        timezone: z.string().optional().describe('Timezone used for these stats, in Olson Country/Region format.'),
        timeout: z.number().optional().describe('Keystroke timeout setting, in minutes, used to calculate these stats.'),
        writes_only: z.boolean().optional().describe('Whether these stats were calculated using the writes-only setting.'),
        status: z.string().optional().describe('Status of these stats in the cache, e.g. "ok" or "pending_update".'),
        percent_calculated: z.number().optional().describe('Percent of these stats finished updating in the background, from 0 to 100.'),
        is_already_updating: z.boolean().optional().describe('Whether these stats are currently being updated in the background.'),
        is_up_to_date: z.boolean().optional().describe('Whether these stats are up to date; false means they are stale or still calculating.'),
        is_up_to_date_pending_future: z.boolean().optional().describe('Whether an up-to-date calculation is pending for a future date range.'),
        is_stuck: z.boolean().optional().describe('Whether processing got stuck and the stats will be recalculated in the background.'),
        is_cached: z.boolean().optional().describe('Whether this response came from cached data.'),
        is_including_today: z.boolean().optional().describe('Whether these stats include the current day.'),
        human_readable_range: z.string().optional().describe('Time range as a human-readable string, e.g. "last week".'),
        total_seconds: z.number().optional().describe('Total coding activity, excluding the "Other" language, in seconds.'),
        total_seconds_including_other_language: z.number().optional().describe('Total coding activity, including the "Other" language, in seconds.'),
        human_readable_total: z.string().optional().describe('Total coding activity, excluding the "Other" language, as a human-readable string.'),
        human_readable_total_including_other_language: z
            .string()
            .optional()
            .describe('Total coding activity, including the "Other" language, as a human-readable string.'),
        daily_average: z.number().optional().describe('Average coding activity per day, excluding the "Other" language, in seconds.'),
        daily_average_including_other_language: z.number().optional().describe('Average coding activity per day, including the "Other" language, in seconds.'),
        human_readable_daily_average: z
            .string()
            .optional()
            .describe('Average coding activity per day, excluding the "Other" language, as a human-readable string.'),
        human_readable_daily_average_including_other_language: z
            .string()
            .optional()
            .describe('Average coding activity per day, including the "Other" language, as a human-readable string.'),
        holidays: z.number().optional().describe('Number of days in the range with no coding activity.'),
        days_including_holidays: z.number().optional().describe('Number of days in the range.'),
        days_minus_holidays: z.number().optional().describe('Number of days in the range excluding days with no coding activity.'),
        ai_additions: z.number().optional().describe('Number of lines added by GenAI tools.'),
        ai_deletions: z.number().optional().describe('Number of lines removed by GenAI tools.'),
        human_additions: z.number().optional().describe('Number of lines added by manual typing.'),
        human_deletions: z.number().optional().describe('Number of lines removed by manual typing.'),
        ai_line_changes_total: z.number().optional().describe('Total number of lines added or removed by AI models.'),
        ai_input_tokens: z.number().optional().describe('Number of input tokens sent to GenAI tools.'),
        ai_cached_input_tokens: z.number().optional().describe('Number of cached input tokens used by GenAI tools.'),
        ai_output_tokens: z.number().optional().describe('Number of output tokens generated by GenAI tools.'),
        ai_sessions: z.number().optional().describe('Number of AI coding sessions.'),
        ai_model_total_cost: z.number().optional().describe('Estimated total USD cost across all AI models.'),
        ai_model_line_changes: z.record(z.string(), z.number()).optional().describe('Map of AI model name to lines added or removed by that model.'),
        ai_model_costs: z.record(z.string(), z.number()).optional().describe('Map of AI model name to estimated USD cost for that model.'),
        ai_model_breakdown: z.array(AiModelBreakdownSchema).optional().describe('Per-AI-model line and cost breakdown.'),
        username: z.string().nullable().optional().describe('Public username of the user, or null when not set.'),
        best_day: BestDaySchema.nullable().optional().describe('Day with the most coding time in the range, or null when there is no activity.'),
        languages: z.array(BreakdownSchema).optional().describe('Coding time broken down by programming language.'),
        editors: z.array(BreakdownSchema).optional().describe('Coding time broken down by editor or IDE.'),
        operating_systems: z.array(BreakdownSchema).optional().describe('Coding time broken down by operating system.'),
        projects: z.array(BreakdownSchema).optional().describe('Coding time broken down by project.'),
        categories: z.array(BreakdownSchema).optional().describe('Coding time broken down by activity category, e.g. Coding or Debugging.'),
        dependencies: z.array(BreakdownSchema).optional().describe('Coding time broken down by dependency.'),
        machines: z.array(BreakdownSchema).optional().describe('Coding time broken down by machine.'),
        created_at: z.string().optional().describe('Time these stats were first created, as an ISO 8601 datetime.'),
        modified_at: z.string().optional().describe('Time these stats were last updated, as an ISO 8601 datetime.'),
        is_coding_activity_visible: z.boolean().optional().describe("Whether this user's coding activity is publicly visible."),
        is_language_usage_visible: z.boolean().optional().describe("Whether this user's language stats are publicly visible."),
        is_editor_usage_visible: z.boolean().optional().describe("Whether this user's editor stats are publicly visible."),
        is_category_usage_visible: z.boolean().optional().describe("Whether this user's category stats are publicly visible."),
        is_os_usage_visible: z.boolean().optional().describe("Whether this user's operating system stats are publicly visible."),
        is_ai_model_usage_visible: z.boolean().optional().describe("Whether this user's AI model stats are publicly visible.")
    })
    .passthrough()
    .describe('Aggregate coding-activity stats for the requested time range.');

/**
 * @tags: [read]
 * @tagReason: Reads aggregate coding-activity stats from the provider without mutating any provider data.
 * @pitfalls: Stats may come back mid-calculation (status "pending_update", is_up_to_date false, breakdown arrays omitted) so retry until up to date; breakdown arrays are also omitted when the account's visibility settings hide them, and timeout/writes_only only take effect when range is supplied.
 */
const action = createAction({
    description: 'Get aggregate coding-activity stats (languages, editors, OSes, projects, categories) for a given range.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['read_stats'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://wakatime.com/developers#stats
        const response = await nango.get({
            endpoint: input.range ? `/api/v1/users/current/stats/${encodeURIComponent(input.range)}` : '/api/v1/users/current/stats',
            params: {
                ...(input.timeout !== undefined && { timeout: input.timeout }),
                ...(input.writes_only !== undefined && { writes_only: input.writes_only ? 'true' : 'false' })
            },
            retries: 3
        });

        const envelope = z.object({ data: OutputSchema }).parse(response.data);
        return envelope.data;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
