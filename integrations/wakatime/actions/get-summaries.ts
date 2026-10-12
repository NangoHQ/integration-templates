import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        start: z
            .string()
            .regex(/^\d{4}-\d{2}-\d{2}$/)
            .optional()
            .describe('Start date of the range in YYYY-MM-DD format. Required unless "range" is provided.'),
        end: z
            .string()
            .regex(/^\d{4}-\d{2}-\d{2}$/)
            .optional()
            .describe('End date of the range in YYYY-MM-DD format. Required unless "range" is provided.'),
        range: z.string().optional().describe('Named range used instead of start/end, e.g. "Last 7 Days". Mutually exclusive with start/end.'),
        project: z.string().optional().describe('Only include coding activity logged to this project.'),
        branches: z.string().optional().describe('Comma-separated list of branch names to filter the activity by.')
    })
    .describe('Filters for the summaries request: either a start/end date range or a named range, plus optional project and branch filters.');

const ProviderBreakdownSchema = z.object({
    name: z.string(),
    total_seconds: z.number(),
    percent: z.number(),
    digital: z.string(),
    text: z.string(),
    hours: z.number(),
    minutes: z.number(),
    seconds: z.number().optional(),
    machine_name_id: z.string().optional()
});

const ProviderGrandTotalSchema = z.object({
    hours: z.number(),
    minutes: z.number(),
    total_seconds: z.number(),
    digital: z.string(),
    decimal: z.string(),
    text: z.string(),
    ai_additions: z.number().optional(),
    ai_deletions: z.number().optional(),
    human_additions: z.number().optional(),
    human_deletions: z.number().optional(),
    ai_model_line_changes: z.record(z.string(), z.number()).optional(),
    ai_input_tokens: z.number().optional(),
    ai_cached_input_tokens: z.number().optional(),
    ai_output_tokens: z.number().optional(),
    ai_prompt_length_sum: z.number().optional(),
    ai_prompt_events_total: z.number().optional(),
    ai_sessions: z.number().optional(),
    ai_model_costs: z.record(z.string(), z.number()).optional(),
    ai_model_breakdown: z
        .array(
            z.object({
                name: z.string(),
                lines: z.number(),
                input_tokens: z.number(),
                output_tokens: z.number(),
                cached_input_tokens: z.number(),
                cost: z.number()
            })
        )
        .optional(),
    ai_model_total_cost: z.number().optional(),
    ai_prompt_length_avg: z.number().optional(),
    ai_prompt_events_avg_per_session: z.number().optional(),
    ai_prompt_events_median_per_session: z.number().optional(),
    ai_prompt_length_avg_per_session: z.number().optional(),
    ai_prompt_length_median_per_session: z.number().optional()
});

const ProviderDayRangeSchema = z.object({
    date: z.string(),
    start: z.string(),
    end: z.string(),
    text: z.string(),
    timezone: z.string()
});

const ProviderDaySummarySchema = z.object({
    grand_total: ProviderGrandTotalSchema,
    range: ProviderDayRangeSchema,
    categories: z.array(ProviderBreakdownSchema).optional(),
    projects: z.array(ProviderBreakdownSchema).optional(),
    languages: z.array(ProviderBreakdownSchema).optional(),
    editors: z.array(ProviderBreakdownSchema).optional(),
    operating_systems: z.array(ProviderBreakdownSchema).optional(),
    dependencies: z.array(ProviderBreakdownSchema).optional(),
    machines: z.array(ProviderBreakdownSchema).optional()
});

const ProviderSummariesSchema = z.object({
    data: z.array(ProviderDaySummarySchema),
    start: z.string(),
    end: z.string(),
    cumulative_total: z.object({
        seconds: z.number(),
        text: z.string(),
        digital: z.string(),
        decimal: z.string()
    }),
    daily_average: z.object({
        holidays: z.number(),
        days_including_holidays: z.number(),
        days_minus_holidays: z.number(),
        seconds: z.number(),
        text: z.string(),
        seconds_including_other_language: z.number(),
        text_including_other_language: z.string()
    })
});

const BreakdownSchema = z.object({
    name: z.string().describe('Name of the category, project, language, editor, operating system, dependency, or machine.'),
    total_seconds: z.number().describe('Time spent on this item, in seconds.'),
    percent: z.number().describe('Percentage of the day total spent on this item.'),
    digital: z.string().describe('Time spent on this item in digital clock format, e.g. "1:23".'),
    text: z.string().describe('Human-readable time spent on this item, e.g. "1 hr 23 mins".'),
    hours: z.number().describe('Hours portion of the time spent on this item.'),
    minutes: z.number().describe('Minutes portion of the time spent on this item.'),
    seconds: z.number().optional().describe('Seconds portion of the time spent on this item, when provided.'),
    machine_name_id: z.string().optional().describe('Unique machine identifier; only present on machine breakdowns.')
});

const GrandTotalSchema = z.object({
    total_seconds: z.number().describe('Total coding time for the day, in seconds.'),
    hours: z.number().describe('Hours portion of the day total.'),
    minutes: z.number().describe('Minutes portion of the day total.'),
    digital: z.string().describe('Day total in digital clock format, e.g. "1:23".'),
    decimal: z.string().describe('Day total in decimal hours, e.g. "1.38".'),
    text: z.string().describe('Human-readable day total, e.g. "1 hr 23 mins".'),
    ai_additions: z.number().optional().describe('Lines added by AI tools during the day.'),
    ai_deletions: z.number().optional().describe('Lines removed by AI tools during the day.'),
    human_additions: z.number().optional().describe('Lines added by human typing during the day.'),
    human_deletions: z.number().optional().describe('Lines removed by human typing during the day.'),
    ai_model_line_changes: z.record(z.string(), z.number()).optional().describe('Lines changed per AI model during the day, keyed by model name.'),
    ai_input_tokens: z.number().optional().describe('AI input tokens used during the day.'),
    ai_cached_input_tokens: z.number().optional().describe('Cached AI input tokens used during the day.'),
    ai_output_tokens: z.number().optional().describe('AI output tokens generated during the day.'),
    ai_prompt_length_sum: z.number().optional().describe('Sum of characters typed in AI prompts during the day.'),
    ai_prompt_events_total: z.number().optional().describe('Number of AI prompts sent during the day.'),
    ai_sessions: z.number().optional().describe('Number of distinct AI sessions during the day.'),
    ai_model_costs: z.record(z.string(), z.number()).optional().describe('Estimated USD cost per AI model during the day, keyed by model name.'),
    ai_model_breakdown: z
        .array(
            z.object({
                name: z.string().describe('AI model name.'),
                lines: z.number().describe('Lines added or removed by this model during the day.'),
                input_tokens: z.number().describe('Input tokens used by this model during the day.'),
                output_tokens: z.number().describe('Output tokens generated by this model during the day.'),
                cached_input_tokens: z.number().describe('Cached input tokens used by this model during the day.'),
                cost: z.number().describe('Estimated USD cost for this model during the day.')
            })
        )
        .optional()
        .describe('Per-model AI usage breakdown for the day.'),
    ai_model_total_cost: z.number().optional().describe('Estimated total USD cost for all AI models during the day.'),
    ai_prompt_length_avg: z.number().optional().describe('Mean character length of AI prompts during the day.'),
    ai_prompt_events_avg_per_session: z.number().optional().describe('Average number of AI prompts per session during the day.'),
    ai_prompt_events_median_per_session: z.number().optional().describe('Median number of AI prompts per session during the day.'),
    ai_prompt_length_avg_per_session: z.number().optional().describe('Average across AI sessions of each session mean prompt length during the day.'),
    ai_prompt_length_median_per_session: z.number().optional().describe('Median across AI sessions of each session mean prompt length during the day.')
});

const DayRangeSchema = z.object({
    date: z.string().describe('Day in YYYY-MM-DD format.'),
    start: z.string().describe('Start of the day as an ISO 8601 UTC datetime.'),
    end: z.string().describe('End of the day as an ISO 8601 UTC datetime.'),
    text: z.string().describe('Human-readable day label.'),
    timezone: z.string().describe('Timezone used for the day, in Olson Country/Region format.')
});

const DaySummarySchema = z.object({
    date: z.string().describe('Day these totals cover, in YYYY-MM-DD format.'),
    grand_total: GrandTotalSchema.describe('Aggregated coding totals for the day.'),
    categories: z.array(BreakdownSchema).describe('Coding time grouped by activity category.'),
    projects: z.array(BreakdownSchema).describe('Coding time grouped by project.'),
    languages: z.array(BreakdownSchema).describe('Coding time grouped by programming language.'),
    editors: z.array(BreakdownSchema).describe('Coding time grouped by editor.'),
    operating_systems: z.array(BreakdownSchema).describe('Coding time grouped by operating system.'),
    dependencies: z.array(BreakdownSchema).describe('Coding time grouped by dependency.'),
    machines: z.array(BreakdownSchema).describe('Coding time grouped by machine.'),
    range: DayRangeSchema.describe('Start, end, and label of the day window.')
});

const OutputSchema = z
    .object({
        summaries: z.array(DaySummarySchema).describe('One entry per day in the requested range.'),
        cumulative_total: z
            .object({
                seconds: z.number().describe('Total coding seconds across the range.'),
                text: z.string().describe('Human-readable range total.'),
                digital: z.string().describe('Range total in digital clock format.'),
                decimal: z.string().describe('Range total in decimal hours.')
            })
            .describe('Totals across the entire requested range.'),
        daily_average: z
            .object({
                holidays: z.number().describe('Number of days in the range with no coding time logged.'),
                days_including_holidays: z.number().describe('Total number of days in the range.'),
                days_minus_holidays: z.number().describe('Number of days in the range with coding activity.'),
                seconds: z.number().describe('Average coding seconds per day, excluding the Other language.'),
                text: z.string().describe('Human-readable daily average, excluding the Other language.'),
                seconds_including_other_language: z.number().describe('Average coding seconds per day, including the Other language.'),
                text_including_other_language: z.string().describe('Human-readable daily average, including the Other language.')
            })
            .describe('Per-day averages across the range.'),
        start: z.string().describe('Start of the requested range as an ISO 8601 UTC datetime.'),
        end: z.string().describe('End of the requested range as an ISO 8601 UTC datetime.')
    })
    .describe('Per-day coding-activity summaries for the requested range, including cumulative totals and daily averages.');

/**
 * @tags: [read]
 * @tagReason: Reads the account's daily coding-activity summaries from WakaTime without modifying any provider data.
 * @pitfalls: Days with no coding activity are still returned with zero totals, and each day's window follows the account's timezone, so day boundaries may not match the caller's local calendar day.
 */
const action = createAction({
    description: 'Get per-day coding-activity summaries over a date range.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['read_summaries'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        if (input.range && (input.start || input.end)) {
            throw new nango.ActionError({
                type: 'invalid_input',
                message: 'Provide either "range" or both "start" and "end", not both.'
            });
        }

        if (!input.range && (!input.start || !input.end)) {
            throw new nango.ActionError({
                type: 'invalid_input',
                message: 'Provide both "start" and "end", or a "range".'
            });
        }

        const params: Record<string, string> = {};

        if (input.range) {
            params['range'] = input.range;
        } else if (input.start && input.end) {
            params['start'] = input.start;
            params['end'] = input.end;
        }

        if (input.project) {
            params['project'] = input.project;
        }

        if (input.branches) {
            params['branches'] = input.branches;
        }

        const response = await nango.get({
            // https://wakatime.com/developers#summaries
            endpoint: '/api/v1/users/current/summaries',
            params,
            retries: 3
        });

        const parsed = ProviderSummariesSchema.parse(response.data);

        const summaries = parsed.data.map((day) => ({
            date: day.range.date,
            grand_total: day.grand_total,
            categories: day.categories ?? [],
            projects: day.projects ?? [],
            languages: day.languages ?? [],
            editors: day.editors ?? [],
            operating_systems: day.operating_systems ?? [],
            dependencies: day.dependencies ?? [],
            machines: day.machines ?? [],
            range: day.range
        }));

        return {
            summaries,
            cumulative_total: parsed.cumulative_total,
            daily_average: parsed.daily_average,
            start: parsed.start,
            end: parsed.end
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
