import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        date: z
            .string()
            .regex(/^\d{4}-\d{2}-\d{2}$/, 'date must be in YYYY-MM-DD format')
            .describe("The day to list heartbeats for, in YYYY-MM-DD format. The day runs from midnight to midnight in the account's own timezone, not UTC.")
    })
    .describe('Input for listing all heartbeats recorded on a single given day.');

const HeartbeatSchema = z.object({
    id: z.string().nullable().optional().describe('Unique identifier of the heartbeat.'),
    entity: z.string().nullable().optional().describe('The file path, domain, URL, or app the activity was logged against.'),
    type: z.string().nullable().optional().describe('Type of the entity, such as file, app, url, or domain.'),
    category: z.string().nullable().optional().describe('Category of the activity, such as coding, debugging, or writing tests.'),
    time: z.number().nullable().optional().describe('UNIX epoch timestamp (seconds, with fractional seconds) when the activity occurred.'),
    project: z.string().nullable().optional().describe('Name of the project the activity belongs to.'),
    project_root_count: z.number().nullable().optional().describe('Number of folders in the project root path.'),
    branch: z.string().nullable().optional().describe('Version-control branch name the activity occurred on.'),
    language: z.string().nullable().optional().describe('Programming language of the entity.'),
    dependencies: z.array(z.string()).nullable().optional().describe('Dependencies detected in the entity file.'),
    machine_name_id: z.string().nullable().optional().describe('Unique identifier of the machine that generated the heartbeat.'),
    user_agent_id: z.string().nullable().optional().describe('Unique identifier of the editor/plugin that generated the heartbeat.'),
    user_id: z.string().nullable().optional().describe('Unique identifier of the user the heartbeat belongs to.'),
    lines: z.number().nullable().optional().describe('Total number of lines in the entity when the entity is a file.'),
    lineno: z.number().nullable().optional().describe('Cursor line number at the time of the heartbeat.'),
    cursorpos: z.number().nullable().optional().describe('Cursor column position at the time of the heartbeat.'),
    is_write: z.boolean().nullable().optional().describe('Whether the heartbeat was triggered by writing to a file.'),
    created_at: z.string().nullable().optional().describe('ISO 8601 UTC datetime when the heartbeat was received.'),
    ai_line_changes: z.number().nullable().optional().describe('Number of lines added or removed by GenAI since the previous heartbeat.'),
    human_line_changes: z.number().nullable().optional().describe('Number of lines added or removed by typing since the previous heartbeat.'),
    ai_session: z.string().nullable().optional().describe('Identifier of the AI session associated with the heartbeat.'),
    ai_input_tokens: z.number().nullable().optional().describe('Number of user input tokens used by GenAI tools since the previous heartbeat.'),
    ai_cached_input_tokens: z.number().nullable().optional().describe('Number of cached input tokens used by GenAI tools since the previous heartbeat.'),
    ai_output_tokens: z.number().nullable().optional().describe('Number of output tokens used by GenAI tools since the previous heartbeat.'),
    ai_prompt_length: z.number().nullable().optional().describe('Number of user prompt characters typed to AI since the previous heartbeat.'),
    ai_subscription_plan: z.string().nullable().optional().describe('Subscription plan of the GenAI tool used for this heartbeat.')
});

const ProviderResponseSchema = z.object({
    data: z.array(HeartbeatSchema),
    start: z.string().optional(),
    end: z.string().optional(),
    timezone: z.string().optional()
});

const OutputSchema = z
    .object({
        heartbeats: z.array(HeartbeatSchema).describe('Heartbeats recorded during the requested day, ordered by time.'),
        start: z.string().optional().describe('Start of the requested day as an ISO 8601 UTC datetime.'),
        end: z.string().optional().describe('End of the requested day as an ISO 8601 UTC datetime.'),
        timezone: z.string().optional().describe("Olson Country/Region timezone used to compute the day's boundaries.")
    })
    .describe('Heartbeats recorded during the requested day, along with the day boundaries and timezone used to compute them.');

/**
 * @tags: [read]
 * @tagReason: Reads heartbeats for a given day from the provider and does not modify any provider data.
 * @pitfalls: The requested day spans midnight-to-midnight in the account's own timezone, so the returned start/end are UTC instants that may not align to UTC midnight; a heartbeat just recorded may not be returned immediately because the provider ingests new activity with a variable delay, so an empty result right after a write does not mean the write failed.
 */
const action = createAction({
    description: 'List all heartbeats (individual coding-activity pings) recorded for a single given day.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['read_heartbeats'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://wakatime.com/developers#heartbeats
            endpoint: '/api/v1/users/current/heartbeats',
            params: {
                date: input.date
            },
            retries: 3
        });

        const parsed = ProviderResponseSchema.parse(response.data);

        return {
            heartbeats: parsed.data,
            ...(parsed.start !== undefined && { start: parsed.start }),
            ...(parsed.end !== undefined && { end: parsed.end }),
            ...(parsed.timezone !== undefined && { timezone: parsed.timezone })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
