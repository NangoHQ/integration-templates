import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const ProviderTeamMemberSchema = z.object({
    id: z.number(),
    name: z.string().nullable(),
    email: z.string().nullable(),
    meta: z.unknown().nullable()
});

const ProviderTeamSchema = z.object({
    id: z.number(),
    uri: z.string(),
    name: z.string(),
    description: z.string().nullable(),
    decoration: z.unknown().nullable(),
    members: z.array(ProviderTeamMemberSchema),
    created_datetime: z.string().nullable()
});

const TeamMemberSchema = z
    .object({
        id: z.number().describe('ID of the team member user.'),
        name: z.string().optional().describe('The full name of the user.'),
        email: z.string().optional().describe('The email address of the user.'),
        meta: z.unknown().optional().describe('User-defined JSON field with additional info about the user.')
    })
    .describe('A user within a team.');

const TeamSchema = z
    .object({
        id: z.string().describe('ID of the team.'),
        uri: z.string().describe('URI of the team object.'),
        name: z.string().describe('Name of the team.'),
        description: z.string().optional().describe('Longer description of the team.'),
        decoration: z
            .object({
                emoji: z.string().optional().describe('Emoji displayed before the team name.')
            })
            .optional()
            .describe('Object describing how the team appears on the webpage.'),
        members: z.array(TeamMemberSchema).describe('The list of users within the team.'),
        created_datetime: z.string().optional().describe('When the team was created.')
    })
    .describe('A team represents a group of users in Gorgias.');

const sync = createSync({
    description: 'Sync teams.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    models: {
        Team: TeamSchema
    },

    exec: async (nango) => {
        // Blocker: the Gorgias API only supports order_by for teams, not a changed-since filter.
        // Only the Events endpoint exposes a true modified-since filter.

        await nango.trackDeletesStart('Team');

        const proxyConfig: ProxyConfiguration = {
            // https://developers.gorgias.com/reference/list-teams
            endpoint: '/api/teams',
            paginate: {
                type: 'cursor',
                cursor_path_in_response: 'meta.next_cursor',
                cursor_name_in_request: 'cursor',
                response_path: 'data',
                limit_name_in_request: 'limit',
                limit: 100
            },
            retries: 3
        };

        for await (const page of nango.paginate(proxyConfig)) {
            const teams = [];

            for (const rawTeam of page) {
                const parsed = ProviderTeamSchema.safeParse(rawTeam);
                if (!parsed.success) {
                    throw new Error(`Failed to parse team: ${parsed.error.message}`);
                }
                const data = parsed.data;
                teams.push({
                    id: String(data.id),
                    uri: data.uri,
                    name: data.name,
                    ...(data.description != null && { description: data.description }),
                    ...(data.decoration != null &&
                        typeof data.decoration === 'object' && {
                            decoration: data.decoration
                        }),
                    members: data.members.map((member) => ({
                        id: member.id,
                        ...(member.name != null && { name: member.name }),
                        ...(member.email != null && { email: member.email }),
                        ...(member.meta != null && { meta: member.meta })
                    })),
                    ...(data.created_datetime != null && { created_datetime: data.created_datetime })
                });
            }

            if (teams.length > 0) {
                await nango.batchSave(teams, 'Team');
            }
        }

        await nango.trackDeletesEnd('Team');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
