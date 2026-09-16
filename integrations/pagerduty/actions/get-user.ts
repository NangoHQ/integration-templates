import { z } from 'zod';
import { createAction } from 'nango';

const ProviderReferenceSchema = z.object({
    id: z.string().describe('The unique identifier of the referenced resource.'),
    type: z.string().describe('The type of the referenced resource.'),
    summary: z.string().nullish().describe('A short summary or label for the referenced resource.')
});

const InputSchema = z
    .object({
        id: z.string().describe('The unique identifier of the user to retrieve. Example: "PJB72P3".'),
        include: z
            .array(z.string())
            .optional()
            .describe('Additional sub-resources to include in the response, such as "contact_methods", "notification_rules", or "teams".')
    })
    .describe('Input for retrieving a single PagerDuty user by ID.');

const OutputSchema = z
    .object({
        id: z.string().describe('The unique identifier of the user.'),
        name: z.string().describe('The display name of the user.'),
        email: z.string().describe('The email address of the user.'),
        role: z.string().describe('The role of the user in the account.'),
        job_title: z.string().optional().describe('The job title of the user.'),
        time_zone: z.string().optional().describe('The time zone of the user.'),
        description: z.string().optional().describe('A description of the user.'),
        created_at: z.string().optional().describe('The ISO 8601 timestamp when the user was created.'),
        updated_at: z.string().optional().describe('The ISO 8601 timestamp when the user was last updated.'),
        contact_methods: z
            .array(ProviderReferenceSchema)
            .optional()
            .describe('Contact methods associated with the user, returned when "contact_methods" is included.'),
        notification_rules: z
            .array(ProviderReferenceSchema)
            .optional()
            .describe('Notification rules associated with the user, returned when "notification_rules" is included.'),
        teams: z.array(ProviderReferenceSchema).optional().describe('Teams the user belongs to, returned when "teams" is included.')
    })
    .describe('Output representing a single PagerDuty user, optionally including related reference data.');

const ProviderUserSchema = z.object({
    user: z.object({
        id: z.string(),
        name: z.string(),
        email: z.string(),
        role: z.string(),
        job_title: z.string().nullish(),
        time_zone: z.string().nullish(),
        description: z.string().nullish(),
        created_at: z.string().nullish(),
        updated_at: z.string().nullish(),
        contact_methods: z.array(ProviderReferenceSchema).nullish(),
        notification_rules: z.array(ProviderReferenceSchema).nullish(),
        teams: z.array(ProviderReferenceSchema).nullish()
    })
});

/**
 * @tags: [read]
 * @tagReason: Retrieves a single user by ID from the PagerDuty API.
 * @pitfalls: Embedded contact methods, notification rules, and teams are returned as lightweight reference objects containing only id, type, and summary rather than full configuration details.
 */
const action = createAction({
    description: 'Retrieve a single user.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://developer.pagerduty.com/api-reference/reference/REST/openapiv3.json/paths/~1users~1%7Bid%7D/get
            endpoint: `/users/${encodeURIComponent(input.id)}`,
            params: {
                ...(input.include !== undefined && input.include.length > 0 && { include: input.include })
            },
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: `User with ID "${input.id}" was not found.`
            });
        }

        const providerUser = ProviderUserSchema.parse(response.data);
        const user = providerUser.user;

        return {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            ...(user.job_title != null && { job_title: user.job_title }),
            ...(user.time_zone != null && { time_zone: user.time_zone }),
            ...(user.description != null && { description: user.description }),
            ...(user.created_at != null && { created_at: user.created_at }),
            ...(user.updated_at != null && { updated_at: user.updated_at }),
            ...(user.contact_methods != null && { contact_methods: user.contact_methods }),
            ...(user.notification_rules != null && { notification_rules: user.notification_rules }),
            ...(user.teams != null && { teams: user.teams })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
