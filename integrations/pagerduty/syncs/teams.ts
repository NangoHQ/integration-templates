import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const PagerDutyTeamReferenceSchema = z.object({
    id: z.string(),
    type: z.string(),
    summary: z.string().optional(),
    self: z.string().optional(),
    html_url: z.string().optional()
});

const PagerDutyTeamSchema = z.object({
    id: z.string(),
    type: z.string(),
    summary: z.string().optional(),
    self: z.string().optional(),
    html_url: z.string().optional(),
    name: z.string(),
    description: z.string().nullable().optional(),
    default_role: z.string().nullable().optional(),
    parent: PagerDutyTeamReferenceSchema.nullable().optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional()
});

const TeamSchema = z
    .object({
        id: z.string().describe('The unique identifier of the team.'),
        name: z.string().describe('The display name of the team.'),
        description: z.string().optional().describe('A description of the team.'),
        default_role: z.string().optional().describe('The default role assigned to users in this team.'),
        summary: z.string().optional().describe('A short summary of the team.'),
        self: z.string().optional().describe('The API URL of the team resource.'),
        html_url: z.string().optional().describe('The URL to the team in the PagerDuty web interface.'),
        parent: z
            .object({
                id: z.string().describe('The unique identifier of the parent team.'),
                type: z.string().describe('The type of the parent team reference.'),
                summary: z.string().optional().describe('A short summary of the parent team.'),
                self: z.string().optional().describe('The API URL of the parent team resource.'),
                html_url: z.string().optional().describe('The URL to the parent team in the PagerDuty web interface.')
            })
            .optional()
            .describe('The parent team, if this team is nested.'),
        created_at: z.string().optional().describe('The ISO 8601 timestamp when the team was created.'),
        updated_at: z.string().optional().describe('The ISO 8601 timestamp when the team was last updated.')
    })
    .describe('A PagerDuty team.');

const CheckpointSchema = z.object({
    offset: z.number()
});

const sync = createSync({
    description: 'Sync teams.',
    version: '1.0.1',
    frequency: 'every hour',
    autoStart: true,
    scopes: ['teams.read'],
    checkpoint: CheckpointSchema,
    models: {
        Team: TeamSchema
    },

    exec: async (nango) => {
        const rawCheckpoint = await nango.getCheckpoint();
        const checkpoint = rawCheckpoint == null ? undefined : CheckpointSchema.parse(rawCheckpoint);
        const startOffset = checkpoint?.offset ?? 0;
        let offset: number | undefined = startOffset;

        await nango.trackDeletesStart('Team');

        const proxyConfig: ProxyConfiguration = {
            // https://developer.pagerduty.com/api-reference/a35f60fcd4f70-list-teams
            endpoint: '/teams',
            paginate: {
                type: 'offset',
                offset_name_in_request: 'offset',
                offset_start_value: startOffset,
                limit_name_in_request: 'limit',
                limit: 2,
                response_path: 'teams',
                on_page: async ({ nextPageParam }) => {
                    offset = typeof nextPageParam === 'number' ? nextPageParam : undefined;
                }
            },
            retries: 3
        };

        for await (const pageResults of nango.paginate(proxyConfig)) {
            const teams = [];

            for (const record of pageResults) {
                const parsed = PagerDutyTeamSchema.safeParse(record);
                if (!parsed.success) {
                    throw new Error(`Failed to parse team record: ${parsed.error.message}`);
                }

                const team = parsed.data;
                teams.push({
                    id: team.id,
                    name: team.name,
                    ...(team.description != null && { description: team.description }),
                    ...(team.default_role != null && { default_role: team.default_role }),
                    ...(team.summary != null && { summary: team.summary }),
                    ...(team.self != null && { self: team.self }),
                    ...(team.html_url != null && { html_url: team.html_url }),
                    ...(team.parent != null && {
                        parent: {
                            id: team.parent.id,
                            type: team.parent.type,
                            ...(team.parent.summary != null && { summary: team.parent.summary }),
                            ...(team.parent.self != null && { self: team.parent.self }),
                            ...(team.parent.html_url != null && { html_url: team.parent.html_url })
                        }
                    }),
                    ...(team.created_at != null && { created_at: team.created_at }),
                    ...(team.updated_at != null && { updated_at: team.updated_at })
                });
            }

            if (teams.length > 0) {
                await nango.batchSave(teams, 'Team');
            }

            if (offset !== undefined) {
                await nango.saveCheckpoint({ offset });
            }
        }

        await nango.clearCheckpoint();
        await nango.trackDeletesEnd('Team');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
