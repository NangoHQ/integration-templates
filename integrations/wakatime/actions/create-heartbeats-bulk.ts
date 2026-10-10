import { z } from 'zod';
import { createAction } from 'nango';

const HeartbeatInputSchema = z.object({
    entity: z
        .string()
        .min(1)
        .describe(
            'Entity the heartbeat logs time against, such as an absolute file path, app name, URL, or domain. Example: "/home/user/project/src/index.ts"'
        ),
    type: z.enum(['file', 'app', 'url', 'domain']).describe('Type of the entity. One of "file", "app", "url", or "domain".'),
    time: z.number().describe('UNIX epoch timestamp in seconds for when the activity occurred; fractional seconds are allowed. Example: 1700000000.5'),
    category: z.string().optional().describe('Activity category. Example: "coding". Normally inferred from type when omitted.'),
    project: z.string().optional().describe('Project name. A project that does not already exist is created automatically. Example: "my-project"'),
    project_root_count: z.number().int().optional().describe('Number of folders in the project root path. Example: 5'),
    branch: z.string().optional().describe('Version control branch name. Example: "main"'),
    language: z.string().optional().describe('Programming language name. Example: "TypeScript"'),
    dependencies: z.string().optional().describe('Comma separated list of dependencies detected in the entity file. Example: "react,axios"'),
    lines: z.number().int().optional().describe('Total number of lines in the entity when type is "file".'),
    ai_line_changes: z.number().int().optional().describe('Number of lines added or removed by GenAI since the last heartbeat in the current file.'),
    human_line_changes: z.number().int().optional().describe('Number of lines added or removed by typing since the last heartbeat in the current file.'),
    ai_session: z.string().optional().describe('AI session id associated with this heartbeat.'),
    ai_input_tokens: z.number().int().optional().describe('Number of user input tokens used since the last heartbeat by GenAI tools.'),
    ai_output_tokens: z.number().int().optional().describe('Number of output tokens used since the last heartbeat by GenAI tools.'),
    ai_prompt_length: z.number().int().optional().describe('Number of user prompt characters typed to AI since the last heartbeat.'),
    ai_subscription_plan: z.string().optional().describe('Subscription plan for the GenAI tool used for this heartbeat.'),
    lineno: z.number().int().optional().describe('Current line row number of the cursor, starting at 1.'),
    cursorpos: z.number().int().optional().describe('Current cursor column position, starting at 1.'),
    is_write: z.boolean().optional().describe('Whether the heartbeat was triggered by writing to a file.')
});

const InputSchema = z
    .object({
        heartbeats: z
            .array(HeartbeatInputSchema)
            .min(1)
            .max(25)
            .describe('Heartbeats to send in a single request. WakaTime accepts between 1 and 25 heartbeats per call.')
    })
    .describe('Input for sending one or more coding-activity heartbeats to WakaTime in a single bulk request.');

const BulkHeartbeatItemSchema = z.tuple([
    z.object({
        data: z
            .object({
                id: z.string()
            })
            .nullable()
            .optional(),
        skip: z.string().nullable().optional()
    }),
    z.number().int()
]);

const BulkHeartbeatResponseSchema = z.object({
    responses: z.array(BulkHeartbeatItemSchema)
});

const HeartbeatResultSchema = z.object({
    id: z
        .string()
        .optional()
        .describe('Server-generated id of the created heartbeat, present when the heartbeat was accepted. Use it later to delete the heartbeat.'),
    status_code: z
        .number()
        .int()
        .describe('Per-heartbeat HTTP status code WakaTime returned inside the bulk response. Example: 201 for an accepted heartbeat.'),
    skip: z.string().optional().describe('Reason WakaTime skipped creating this heartbeat, if any. Example: "Too many duplicate heartbeats."')
});

const OutputSchema = z
    .object({
        results: z.array(HeartbeatResultSchema).describe('One result per submitted heartbeat, in the same order as the input heartbeats.')
    })
    .describe('Per-heartbeat results of the bulk create request, one entry per submitted heartbeat.');

/**
 * @tags: [write]
 * @tagReason: Creates new coding-activity heartbeats in WakaTime through the bulk heartbeats endpoint.
 * @pitfalls: Individual heartbeat failures do not fail the call, so inspect each per-item status code and skip reason; a resent identical heartbeat is skipped rather than duplicated; newly created heartbeats may not appear in reads immediately due to asynchronous processing; a project name that does not already exist is created automatically and can outlive the heartbeat if it is later deleted.
 */
const action = createAction({
    description: "Send one or more coding-activity heartbeats in a single call (up to 25 per request, per WakaTime's documented limit).",
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['write_heartbeats'],
    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://wakatime.com/developers#heartbeats
            endpoint: '/api/v1/users/current/heartbeats.bulk',
            data: input.heartbeats,
            // Creating heartbeats is not idempotent; a retry after a lost response would create duplicate heartbeats.
            // eslint-disable-next-line @nangohq/custom-integrations-linting/proxy-call-retries
            retries: 0
        });

        const parsed = BulkHeartbeatResponseSchema.parse(response.data);

        const results = parsed.responses.map(([body, status_code]) => {
            const id = body.data?.id;
            const skip = body.skip;
            return {
                status_code,
                ...(id != null && { id }),
                ...(skip != null && { skip })
            };
        });

        return {
            results
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
