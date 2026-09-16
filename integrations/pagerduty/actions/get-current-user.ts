import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({}).describe('No input required for this action.');

const OutputSchema = z
    .object({
        id: z.string().describe('The unique identifier for the user.'),
        type: z.string().describe('The type of object. Always "user" for user objects.'),
        summary: z.string().describe('A short summary of the user.'),
        self: z.string().describe('The API show URL for the user.'),
        html_url: z.string().describe('A URL at which the user is uniquely displayed in the Web app.'),
        name: z.string().describe('The name of the user.'),
        email: z.string().describe("The user's email address."),
        time_zone: z.string().describe("The user's preferred time zone."),
        color: z.string().describe('The schedule color for the user.'),
        role: z
            .string()
            .describe(
                "The user's role (e.g., owner, admin, user, observer, limited_user, team_responder, restricted_access, read_only_user, read_only_limited_user)."
            ),
        avatar_url: z.string().optional().describe("The URL of the user's avatar image."),
        description: z.string().nullable().optional().describe("The user's bio."),
        invitation_sent: z.boolean().describe('Whether an invitation email has already been sent to the user.'),
        job_title: z.string().nullable().optional().describe("The user's job title."),
        teams: z
            .array(
                z.object({
                    id: z.string().describe('The unique identifier for the team.'),
                    type: z.string().describe('The type of object. Always "team_reference" for team references.'),
                    summary: z.string().describe('A short summary of the team.'),
                    self: z.string().describe('The API show URL for the team.'),
                    html_url: z.string().describe('A URL at which the team is uniquely displayed in the Web app.'),
                    name: z.string().optional().describe('The name of the team.')
                })
            )
            .optional()
            .describe('The teams the user belongs to.'),
        contact_methods: z
            .array(
                z
                    .object({
                        id: z.string().describe('The unique identifier for the contact method.'),
                        type: z
                            .string()
                            .describe(
                                'The type of contact method reference (e.g., email_contact_method_reference, phone_contact_method_reference, sms_contact_method_reference, push_notification_contact_method_reference).'
                            ),
                        summary: z.string().describe('A short summary of the contact method.'),
                        self: z.string().describe('The API show URL for the contact method.'),
                        html_url: z.string().nullable().optional().describe('A URL at which the contact method is displayed in the Web app.'),
                        label: z.string().optional().describe('The label for the contact method.')
                    })
                    .passthrough()
            )
            .optional()
            .describe("The user's contact methods."),
        notification_rules: z
            .array(
                z
                    .object({
                        id: z.string().describe('The unique identifier for the notification rule.'),
                        type: z.string().describe('The type of notification rule reference (e.g., assignment_notification_rule_reference).'),
                        summary: z.string().describe('A short summary of the notification rule.'),
                        self: z.string().describe('The API show URL for the notification rule.'),
                        html_url: z.string().nullable().optional().describe('A URL at which the notification rule is displayed in the Web app.'),
                        start_delay_in_minutes: z.number().optional().describe('The delay before this rule is evaluated, in minutes.')
                    })
                    .passthrough()
            )
            .optional()
            .describe("The user's notification rules.")
    })
    .passthrough()
    .describe('The currently authenticated PagerDuty user.');

const ProviderResponseSchema = z.object({
    user: z.object({}).passthrough()
});

/**
 * @tags: [read]
 * @tagReason: Reads the currently authenticated user from the provider.
 * @pitfalls: Embedded contact_methods, notification_rules, and teams are returned as lightweight reference summaries rather than full objects, so fields such as contact details, notification delays, and team names may be absent or null.
 */
const action = createAction({
    description: 'Retrieve the user associated with the current API credentials.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, _input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://developer.pagerduty.com/api-reference/users/get-current-user/
            endpoint: '/users/me',
            params: {
                'include[]': ['contact_methods', 'notification_rules', 'teams']
            },
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);
        const user = OutputSchema.parse(providerResponse.user);

        return user;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
