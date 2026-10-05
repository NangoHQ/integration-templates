import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const CheckpointSchema = z.object({
    offset: z.number().int()
});

const UserSchema = z
    .object({
        id: z.string().describe('The unique identifier of the user.'),
        name: z.string().describe('The full name of the user.'),
        email: z.string().describe('The email address of the user.'),
        type: z.string().describe('The type of the object; always "user" for user records.'),
        summary: z.string().optional().describe('A short summary of the user.'),
        self: z.string().optional().describe('The API URL of the user resource.'),
        html_url: z.string().optional().describe("The URL of the user's profile in the PagerDuty web app."),
        role: z.string().optional().describe("The user's role slug (e.g. owner, admin, user, team_responder)."),
        job_title: z.string().optional().describe("The user's job title."),
        time_zone: z.string().optional().describe("The user's time zone."),
        description: z.string().optional().describe('A description of the user.'),
        invitation_sent: z.boolean().optional().describe('Whether an invitation email has been sent to the user.'),
        created_at: z.string().optional().describe('The ISO 8601 timestamp when the user was created.'),
        updated_at: z.string().optional().describe('The ISO 8601 timestamp when the user was last updated.'),
        avatar_url: z.string().optional().describe("The URL of the user's avatar image."),
        contact_methods: z
            .array(
                z.object({
                    id: z.string().describe('The unique identifier of the contact method.'),
                    type: z.string().describe('The type of the contact method.'),
                    summary: z.string().optional().describe('A short summary of the contact method.')
                })
            )
            .optional()
            .describe("Lightweight reference summaries of the user's contact methods."),
        notification_rules: z
            .array(
                z.object({
                    id: z.string().describe('The unique identifier of the notification rule.'),
                    type: z.string().describe('The type of the notification rule.'),
                    summary: z.string().optional().describe('A short summary of the notification rule.')
                })
            )
            .optional()
            .describe("Lightweight reference summaries of the user's notification rules."),
        teams: z
            .array(
                z.object({
                    id: z.string().describe('The unique identifier of the team.'),
                    type: z.string().describe('The type of the team.'),
                    summary: z.string().optional().describe('A short summary of the team.')
                })
            )
            .optional()
            .describe('Lightweight reference summaries of the teams the user belongs to.')
    })
    .describe('A PagerDuty user account.');

const ProviderContactMethodSchema = z.object({
    id: z.string(),
    type: z.string(),
    summary: z.string().optional()
});

const ProviderNotificationRuleSchema = z.object({
    id: z.string(),
    type: z.string(),
    summary: z.string().optional()
});

const ProviderTeamSchema = z.object({
    id: z.string(),
    type: z.string(),
    summary: z.string().optional()
});

const ProviderUserSchema = z.object({
    id: z.string(),
    name: z.string(),
    email: z.string(),
    type: z.string(),
    summary: z.string().optional(),
    self: z.string().optional(),
    html_url: z.string().optional(),
    role: z.string().optional(),
    job_title: z.string().optional().nullable(),
    time_zone: z.string().optional().nullable(),
    description: z.string().optional().nullable(),
    invitation_sent: z.boolean().optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional(),
    avatar_url: z.string().optional().nullable(),
    contact_methods: z.array(ProviderContactMethodSchema).optional().nullable(),
    notification_rules: z.array(ProviderNotificationRuleSchema).optional().nullable(),
    teams: z.array(ProviderTeamSchema).optional().nullable()
});

function mapUser(raw: unknown) {
    const parsed = ProviderUserSchema.parse(raw);

    return {
        id: parsed.id,
        name: parsed.name,
        email: parsed.email,
        type: parsed.type,
        ...(parsed.summary !== undefined && { summary: parsed.summary }),
        ...(parsed.self !== undefined && { self: parsed.self }),
        ...(parsed.html_url !== undefined && { html_url: parsed.html_url }),
        ...(parsed.role !== undefined && { role: parsed.role }),
        ...(parsed.job_title !== undefined && parsed.job_title !== null && { job_title: parsed.job_title }),
        ...(parsed.time_zone !== undefined && parsed.time_zone !== null && { time_zone: parsed.time_zone }),
        ...(parsed.description !== undefined && parsed.description !== null && { description: parsed.description }),
        ...(parsed.invitation_sent !== undefined && { invitation_sent: parsed.invitation_sent }),
        ...(parsed.created_at !== undefined && { created_at: parsed.created_at }),
        ...(parsed.updated_at !== undefined && { updated_at: parsed.updated_at }),
        ...(parsed.avatar_url !== undefined && parsed.avatar_url !== null && { avatar_url: parsed.avatar_url }),
        ...(parsed.contact_methods !== undefined && parsed.contact_methods !== null && { contact_methods: parsed.contact_methods }),
        ...(parsed.notification_rules !== undefined && parsed.notification_rules !== null && { notification_rules: parsed.notification_rules }),
        ...(parsed.teams !== undefined && parsed.teams !== null && { teams: parsed.teams })
    };
}

const sync = createSync({
    description: 'Sync PagerDuty users.',
    version: '1.0.1',
    frequency: 'every hour',
    autoStart: true,
    scopes: ['users.read'],
    checkpoint: CheckpointSchema,
    models: {
        User: UserSchema
    },

    exec: async (nango) => {
        const rawCheckpoint = await nango.getCheckpoint();
        const checkpoint = rawCheckpoint ? CheckpointSchema.parse(rawCheckpoint) : undefined;
        const startOffset = checkpoint?.offset ?? 0;
        let offset: number | undefined = startOffset;

        // Full refresh required because PagerDuty's GET /users endpoint does not expose a
        // modified-since or updated-after filter (confirmed via OpenAPI parameter list and
        // live testing). Only offset/limit pagination is available, so the checkpoint
        // resumes offset pagination if a run is interrupted.

        await nango.trackDeletesStart('User');

        const proxyConfig: ProxyConfiguration = {
            // https://developer.pagerduty.com/api-reference/
            endpoint: '/users',
            paginate: {
                type: 'offset',
                offset_name_in_request: 'offset',
                offset_start_value: startOffset,
                limit_name_in_request: 'limit',
                response_path: 'users',
                limit: 100,
                on_page: async ({ nextPageParam }) => {
                    offset = typeof nextPageParam === 'number' ? nextPageParam : undefined;
                }
            },
            retries: 3
        };

        for await (const page of nango.paginate(proxyConfig)) {
            const pageItems: unknown[] = page;
            const users = pageItems.map((item) => mapUser(item));

            if (users.length > 0) {
                await nango.batchSave(users, 'User');
            }

            if (offset !== undefined) {
                await nango.saveCheckpoint({ offset });
            }
        }

        await nango.clearCheckpoint();
        await nango.trackDeletesEnd('User');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
