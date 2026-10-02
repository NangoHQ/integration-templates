import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({}).describe('No input required for this action.');

const OutputSchema = z
    .object({
        id: z.string().describe('The unique identifier for the user.'),
        type: z.string().describe('The type of object. Always "user" for user objects.'),
        summary: z.string().optional().describe('A short summary of the user.'),
        self: z.string().optional().describe('The API show URL for the user.'),
        html_url: z.string().optional().describe('A URL at which the user is uniquely displayed in the Web app.'),
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
                    summary: z.string().optional().describe('A short summary of the team.'),
                    self: z.string().optional().describe('The API show URL for the team.'),
                    html_url: z.string().optional().describe('A URL at which the team is uniquely displayed in the Web app.'),
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
                        summary: z.string().optional().describe('A short summary of the contact method.'),
                        self: z.string().optional().describe('The API show URL for the contact method.'),
                        html_url: z.string().optional().describe('A URL at which the contact method is displayed in the Web app.'),
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
                        summary: z.string().optional().describe('A short summary of the notification rule.'),
                        self: z.string().optional().describe('The API show URL for the notification rule.'),
                        html_url: z.string().optional().describe('A URL at which the notification rule is displayed in the Web app.'),
                        start_delay_in_minutes: z.number().optional().describe('The delay before this rule is evaluated, in minutes.')
                    })
                    .passthrough()
            )
            .optional()
            .describe("The user's notification rules.")
    })
    .passthrough()
    .describe('The currently authenticated PagerDuty user.');

// PagerDuty's schema marks summary/self/html_url as nullable (not just optional) on every
// reference object, including the user's own top-level reference fields and each entry in
// teams/contact_methods/notification_rules. OutputSchema above only allows `undefined` for
// these (via `.optional()`), so parsing a response that contains an explicit `null` would
// throw before the action could return. Parse against this nullable "provider" schema first,
// then normalize nulls into the strict output shape. Mirrors get-incident.ts's
// ProviderIncidentSchema vs IncidentSchema split.
const ProviderReferenceFields = {
    summary: z.string().nullish(),
    self: z.string().nullish(),
    html_url: z.string().nullish()
};

const ProviderUserSchema = z
    .object({
        id: z.string(),
        type: z.string(),
        ...ProviderReferenceFields,
        name: z.string(),
        email: z.string(),
        time_zone: z.string(),
        color: z.string(),
        role: z.string(),
        avatar_url: z.string().nullish(),
        description: z.string().nullish(),
        invitation_sent: z.boolean(),
        job_title: z.string().nullish(),
        teams: z
            .array(
                z
                    .object({
                        id: z.string(),
                        type: z.string(),
                        ...ProviderReferenceFields,
                        name: z.string().nullish()
                    })
                    .passthrough()
            )
            .nullish(),
        contact_methods: z
            .array(
                z
                    .object({
                        id: z.string(),
                        type: z.string(),
                        ...ProviderReferenceFields,
                        label: z.string().nullish()
                    })
                    .passthrough()
            )
            .nullish(),
        notification_rules: z
            .array(
                z
                    .object({
                        id: z.string(),
                        type: z.string(),
                        ...ProviderReferenceFields,
                        start_delay_in_minutes: z.number().nullish()
                    })
                    .passthrough()
            )
            .nullish()
    })
    .passthrough();

const ProviderResponseSchema = z.object({
    user: z.object({}).passthrough()
});

function stripNulls(value: unknown): unknown {
    if (value === null) {
        return undefined;
    }
    if (Array.isArray(value)) {
        return value.map(stripNulls).filter((v): v is unknown => v !== undefined);
    }
    if (typeof value === 'object' && value !== undefined) {
        const result: Record<string, unknown> = {};
        for (const [key, val] of Object.entries(value)) {
            const stripped = stripNulls(val);
            if (stripped !== undefined) {
                result[key] = stripped;
            }
        }
        return result;
    }
    return value;
}

/**
 * @tags: [read]
 * @tagReason: Reads the currently authenticated user from the provider.
 * @pitfalls: Embedded contact_methods, notification_rules, and teams are returned as lightweight reference summaries rather than full objects, so fields such as contact details, notification delays, and team names may be absent or null.
 */
const action = createAction({
    description: 'Retrieve the user associated with the current API credentials.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['users.read'],

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
        const providerUser = ProviderUserSchema.parse(providerResponse.user);
        const user = OutputSchema.parse(stripNulls(providerUser));

        return user;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
