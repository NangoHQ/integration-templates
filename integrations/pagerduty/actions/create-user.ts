import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        name: z.string().describe('Full name of the user.'),
        email: z.string().describe('Email address of the user. A real PagerDuty account-invitation email is sent to this address immediately upon creation.'),
        role: z
            .string()
            .optional()
            .describe(
                'Account role slug. Must be an internal API value such as "user", "admin", "observer", "limited_user", "team_responder", "read_only_user", "read_only_limited_user", "owner", or "restricted_access". UI-facing labels like "responder" are rejected.'
            ),
        job_title: z.string().optional().describe('Job title of the user.'),
        time_zone: z.string().optional().describe('Time zone of the user, for example "America/New_York".')
    })
    .describe('Input for creating a new PagerDuty user.');

const ProviderUserSchema = z.object({
    id: z.string(),
    name: z.string(),
    email: z.string(),
    role: z.string().optional(),
    job_title: z.string().optional().nullable(),
    time_zone: z.string().optional().nullable(),
    invitation_sent: z.boolean().optional().nullable(),
    html_url: z.string().optional().nullable(),
    self: z.string().optional().nullable()
});

const OutputSchema = z
    .object({
        id: z.string().describe('The unique identifier of the created user.'),
        name: z.string().describe('Full name of the user.'),
        email: z.string().describe('Email address of the user.'),
        role: z.string().optional().describe('Account role slug assigned to the user.'),
        job_title: z.string().optional().describe('Job title of the user.'),
        time_zone: z.string().optional().describe('Time zone of the user.'),
        invitation_sent: z.boolean().optional().describe('Whether a PagerDuty account-invitation email was sent to the user upon creation.'),
        html_url: z.string().optional().describe('URL to the user in the PagerDuty web interface.'),
        self: z.string().optional().describe('API URL for the user resource.')
    })
    .describe('Output of a newly created PagerDuty user.');

/**
 * @tags: [write]
 * @tagReason: Creates a new user on the PagerDuty account and immediately sends an account-invitation email.
 * @pitfalls: The role field must be an internal API slug (e.g. "user", "admin") rather than a UI-facing label such as "responder". Creating a user immediately sends a real account-invitation email to the address, and the call fails if the email already exists on the account.
 */
const action = createAction({
    description: 'Create a new user on the account.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developer.pagerduty.com/api-reference/cf713fd3c3b1c-create-a-user
        const response = await nango.post({
            endpoint: '/users',
            data: {
                user: {
                    type: 'user',
                    name: input.name,
                    email: input.email,
                    ...(input.role !== undefined && { role: input.role }),
                    ...(input.job_title !== undefined && { job_title: input.job_title }),
                    ...(input.time_zone !== undefined && { time_zone: input.time_zone })
                }
            },
            retries: 1
        });

        const providerUser = ProviderUserSchema.parse(response.data.user);

        return {
            id: providerUser.id,
            name: providerUser.name,
            email: providerUser.email,
            ...(providerUser.role !== undefined && { role: providerUser.role }),
            ...(providerUser.job_title != null && { job_title: providerUser.job_title }),
            ...(providerUser.time_zone != null && { time_zone: providerUser.time_zone }),
            ...(providerUser.invitation_sent != null && { invitation_sent: providerUser.invitation_sent }),
            ...(providerUser.html_url != null && { html_url: providerUser.html_url }),
            ...(providerUser.self != null && { self: providerUser.self })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
