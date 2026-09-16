import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        schedule_id: z.string().describe('The unique identifier of the schedule to query.'),
        since: z.string().optional().describe('The start of the time window as an ISO 8601 timestamp. Defaults to the current time if omitted.'),
        until: z.string().optional().describe('The end of the time window as an ISO 8601 timestamp. Defaults to the current time if omitted.')
    })
    .describe('Input for listing users on-call for a schedule within a time window.');

const UserSchema = z
    .object({
        id: z.string().describe('The unique identifier for the user.'),
        type: z.string().describe('The type of object. Example: "user".'),
        summary: z.string().nullable().optional().describe('A short summary of the user.'),
        self: z.string().nullable().optional().describe('The API show URL for the user.'),
        html_url: z.string().nullable().optional().describe('The URL to the user in the PagerDuty web UI.'),
        name: z.string().describe('The name of the user.'),
        email: z.string().describe('The email address of the user.'),
        role: z.string().describe('The user role. Example: "user", "admin", "owner".'),
        job_title: z.string().nullable().optional().describe('The job title of the user.'),
        time_zone: z.string().nullable().optional().describe('The time zone the user is in.'),
        description: z.string().nullable().optional().describe('A description of the user.'),
        color: z.string().nullable().optional().describe('The color associated with the user.'),
        avatar_url: z.string().nullable().optional().describe('The URL of the user avatar image.'),
        invitation_sent: z.boolean().nullable().optional().describe('Whether an invitation email has been sent.'),
        billed: z.boolean().nullable().optional().describe('Whether the user is billable.'),
        created_at: z.string().nullable().optional().describe('The ISO 8601 timestamp when the user was created.'),
        updated_at: z.string().nullable().optional().describe('The ISO 8601 timestamp when the user was last updated.')
    })
    .passthrough();

const OutputSchema = z
    .object({
        users: z.array(UserSchema).describe('The list of users on-call during the specified time window.')
    })
    .describe('Output containing the list of users on-call for a schedule within a time window.');

/**
 * @tags: [read]
 * @tagReason: Reads the list of users on-call for a schedule within a time window.
 * @pitfalls: Omitting `since` and `until` defaults both to the current time, so only users on-call right now are returned rather than all users configured in the schedule.
 */
const action = createAction({
    description: 'List the users who are on-call according to a schedule within a time window.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['users.read'],
    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://developer.pagerduty.com/api-reference/
            endpoint: `/schedules/${encodeURIComponent(input.schedule_id)}/users`,
            params: {
                ...(input.since !== undefined && { since: input.since }),
                ...(input.until !== undefined && { until: input.until })
            },
            retries: 3
        });

        const ProviderResponseSchema = z.object({
            users: z.array(z.unknown())
        });

        const parsed = ProviderResponseSchema.parse(response.data);
        const users = parsed.users.map((raw) => UserSchema.parse(raw));

        return { users };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
