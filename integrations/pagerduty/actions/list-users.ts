import { z } from 'zod';
import { createAction } from 'nango';

const ReferenceSchema = z.object({
    id: z.string().describe('ID of the referenced resource.'),
    type: z.string().describe('Type of the referenced resource.'),
    summary: z.string().optional().describe('Summary of the referenced resource.'),
    self: z.string().optional().describe('API URL of the referenced resource.'),
    html_url: z.string().optional().describe('Web URL of the referenced resource.')
});

const UserSchema = z.object({
    id: z.string().describe('User ID.'),
    type: z.string().describe('Type of object. Always "user".'),
    summary: z.string().optional().describe('A short summary of the user.'),
    self: z.string().optional().describe('API URL of the user.'),
    html_url: z.string().optional().describe('Web URL of the user.'),
    name: z.string().describe('Name of the user.'),
    email: z.string().describe('Email address of the user.'),
    time_zone: z.string().optional().describe('Time zone of the user.'),
    color: z.string().optional().describe('Color used to represent the user in the UI.'),
    role: z.string().describe('Role of the user.'),
    description: z.string().optional().describe('Description of the user.'),
    invitation_sent: z.boolean().optional().describe('Whether an invitation email has been sent to the user.'),
    job_title: z.string().optional().describe('Job title of the user.'),
    teams: z.array(ReferenceSchema).optional().describe('Teams the user belongs to.'),
    contact_methods: z.array(ReferenceSchema).optional().describe('Contact methods for the user.'),
    notification_rules: z.array(ReferenceSchema).optional().describe('Notification rules for the user.')
});

const InputSchema = z
    .object({
        query: z.string().optional().describe('Search query to filter users by name or email.'),
        team_ids: z.array(z.string()).optional().describe('Filter users by team IDs.'),
        limit: z.number().optional().describe('Number of users to return per page. Defaults to 25.'),
        cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.')
    })
    .describe('Input for listing PagerDuty users.');

const OutputSchema = z
    .object({
        users: z.array(UserSchema).describe('List of users on the account.'),
        next_cursor: z.string().optional().describe('Pagination cursor for the next page, if more results are available.')
    })
    .describe('Output of listing PagerDuty users.');

const ProviderReferenceSchema = z.object({
    id: z.string(),
    type: z.string(),
    summary: z.string().nullable().optional(),
    self: z.string().nullable().optional(),
    html_url: z.string().nullable().optional()
});

const ProviderUserSchema = z.object({
    id: z.string(),
    type: z.string(),
    summary: z.string().optional(),
    self: z.string().optional(),
    html_url: z.string().optional(),
    name: z.string(),
    email: z.string(),
    time_zone: z.string().optional(),
    color: z.string().optional(),
    role: z.string(),
    description: z.string().nullable().optional(),
    invitation_sent: z.boolean().optional(),
    job_title: z.string().nullable().optional(),
    teams: z.array(ProviderReferenceSchema).optional(),
    contact_methods: z.array(ProviderReferenceSchema).optional(),
    notification_rules: z.array(ProviderReferenceSchema).optional()
});

const ProviderListResponseSchema = z.object({
    users: z.array(ProviderUserSchema),
    limit: z.number(),
    offset: z.number(),
    total: z.number().nullable().optional(),
    more: z.boolean()
});

/**
 * @tags: [read]
 * @tagReason: Lists users from the PagerDuty account via GET /users.
 * @pitfalls: Contact methods and notification rules in each user are returned as reference summaries rather than full objects.
 */
const action = createAction({
    description: 'List users on the account, optionally filtered by team.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://developer.pagerduty.com/api-reference/e960cca4c580e-list-users
            endpoint: '/users',
            params: {
                ...(input.query !== undefined && { query: input.query }),
                ...(input.team_ids !== undefined && { 'team_ids[]': input.team_ids }),
                ...(input.limit !== undefined && { limit: input.limit }),
                ...(input.cursor !== undefined && { offset: input.cursor })
            },
            retries: 3
        });

        const listData = ProviderListResponseSchema.parse(response.data);

        return {
            users: listData.users.map((user) => ({
                id: user.id,
                type: user.type,
                ...(user.summary !== undefined && { summary: user.summary }),
                ...(user.self !== undefined && { self: user.self }),
                ...(user.html_url !== undefined && { html_url: user.html_url }),
                name: user.name,
                email: user.email,
                ...(user.time_zone !== undefined && { time_zone: user.time_zone }),
                ...(user.color !== undefined && { color: user.color }),
                role: user.role,
                ...(user.description != null && { description: user.description }),
                ...(user.invitation_sent !== undefined && { invitation_sent: user.invitation_sent }),
                ...(user.job_title != null && { job_title: user.job_title }),
                ...(user.teams !== undefined && {
                    teams: user.teams.map((ref) => ({
                        id: ref.id,
                        type: ref.type,
                        ...(ref.summary != null && { summary: ref.summary }),
                        ...(ref.self != null && { self: ref.self }),
                        ...(ref.html_url != null && { html_url: ref.html_url })
                    }))
                }),
                ...(user.contact_methods !== undefined && {
                    contact_methods: user.contact_methods.map((ref) => ({
                        id: ref.id,
                        type: ref.type,
                        ...(ref.summary != null && { summary: ref.summary }),
                        ...(ref.self != null && { self: ref.self }),
                        ...(ref.html_url != null && { html_url: ref.html_url })
                    }))
                }),
                ...(user.notification_rules !== undefined && {
                    notification_rules: user.notification_rules.map((ref) => ({
                        id: ref.id,
                        type: ref.type,
                        ...(ref.summary != null && { summary: ref.summary }),
                        ...(ref.self != null && { self: ref.self }),
                        ...(ref.html_url != null && { html_url: ref.html_url })
                    }))
                })
            })),
            ...(listData.more && { next_cursor: String(listData.offset + listData.limit) })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
