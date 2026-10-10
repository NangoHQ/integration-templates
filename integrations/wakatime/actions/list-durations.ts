import { z } from 'zod';
import { createAction } from 'nango';

const DurationSchema = z
    .object({
        project: z.string().nullable().optional().describe('Name of the project the duration was logged against; null when the activity had no project.'),
        time: z.number().describe('Start of the duration as a UNIX epoch timestamp in seconds, with sub-second fractional precision.'),
        duration: z.number().describe('Length of the duration in seconds.'),
        ai_additions: z.number().int().optional().describe('Lines added by AI tools during this duration.'),
        ai_deletions: z.number().int().optional().describe('Lines removed by AI tools during this duration.'),
        human_additions: z.number().int().optional().describe('Lines added by manual typing during this duration.'),
        human_deletions: z.number().int().optional().describe('Lines removed by manual typing during this duration.'),
        ai_model_costs: z.record(z.string(), z.number()).optional().describe('Estimated USD cost per AI model used during this duration, keyed by model name.'),
        ai_input_tokens: z.number().int().optional().describe('Number of user input tokens sent to AI tools during this duration.'),
        ai_output_tokens: z.number().int().optional().describe('Number of AI output tokens generated during this duration.'),
        ai_prompt_length_avg: z.number().int().optional().describe('Mean character length of user prompts sent to AI tools during this duration.'),
        ai_prompt_length_avg_per_session: z
            .number()
            .int()
            .optional()
            .describe('Average across AI sessions of each session mean prompt length during this duration.'),
        ai_prompt_length_median_per_session: z
            .number()
            .int()
            .optional()
            .describe('Median across AI sessions of each session mean prompt length during this duration.'),
        ai_prompt_length_sum: z.number().int().optional().describe('Sum of user prompt characters typed to AI tools during this duration.'),
        ai_prompt_events_total: z.number().int().optional().describe('Number of AI prompts sent during this duration.'),
        ai_prompt_events_avg_per_session: z.number().int().optional().describe('Average number of AI prompts per AI session during this duration.'),
        ai_prompt_events_median_per_session: z.number().int().optional().describe('Median number of AI prompts per AI session during this duration.'),
        ai_sessions: z.number().int().optional().describe('Number of distinct AI sessions during this duration.')
    })
    .passthrough()
    .describe('A continuous block of coding activity, formed by joining heartbeats within the keystroke timeout.');

const InputSchema = z
    .object({
        date: z
            .string()
            .regex(/^\d{4}-\d{2}-\d{2}$/)
            .describe('Day to fetch durations for, in YYYY-MM-DD format. Durations span 12am to 11:59pm in the effective timezone. Example: "2026-10-09".'),
        project: z.string().optional().describe('Only return durations logged against this project name.'),
        branches: z.string().optional().describe('Only return durations for these branches, as a comma-separated list of branch names.'),
        timeout: z
            .number()
            .int()
            .positive()
            .optional()
            .describe('Keystroke timeout in minutes used to join heartbeats into durations; defaults to the account keystroke timeout.'),
        writes_only: z.boolean().optional().describe('Only include file-writing activity; defaults to the account writes_only setting.'),
        timezone: z
            .string()
            .optional()
            .describe(
                'Timezone in Olson Country/Region format used to define the day boundaries, for example "America/Los_Angeles"; defaults to the account timezone.'
            ),
        slice_by: z
            .enum(['project', 'entity', 'language', 'dependencies', 'os', 'editor', 'category', 'machine'])
            .optional()
            .describe('Primary key used to split durations; defaults to "project".')
    })
    .describe('Parameters selecting which day and slice of coding durations to return.');

const OutputSchema = z
    .object({
        data: z.array(DurationSchema).describe('Duration blocks for the requested day, in chronological order.'),
        start: z.string().optional().describe('Start of the requested day as an ISO 8601 UTC datetime.'),
        end: z.string().optional().describe('End of the requested day as an ISO 8601 UTC datetime.'),
        timezone: z.string().optional().describe('Timezone used to interpret the requested day, in Olson Country/Region format.')
    })
    .describe('Coding duration blocks for a single day, plus the resolved day range and timezone.');

/**
 * @tags: [read]
 * @tagReason: Fetches existing coding durations for a day via a read-only GET; no provider data is created, changed, or deleted.
 * @pitfalls: Durations are derived asynchronously from heartbeats, so recent activity may not appear immediately; each call covers only a single day (a range needs one call per day), and an empty data array means no activity rather than an error; returned item fields vary with slice_by, which defaults to "project".
 */
const action = createAction({
    description: 'List individual coding-activity duration blocks for a single given day.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['read_heartbeats'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://wakatime.com/developers#durations
            endpoint: '/api/v1/users/current/durations',
            params: {
                date: input.date,
                ...(input.project !== undefined && { project: input.project }),
                ...(input.branches !== undefined && { branches: input.branches }),
                ...(input.timeout !== undefined && { timeout: input.timeout }),
                ...(input.writes_only !== undefined && { writes_only: String(input.writes_only) }),
                ...(input.timezone !== undefined && { timezone: input.timezone }),
                ...(input.slice_by !== undefined && { slice_by: input.slice_by })
            },
            retries: 3
        });

        return OutputSchema.parse(response.data);
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
