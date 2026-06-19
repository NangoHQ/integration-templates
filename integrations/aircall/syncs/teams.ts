import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const ProviderUserSchema = z.object({
    id: z.number().int(),
    direct_link: z.string(),
    name: z.string(),
    email: z.string(),
    availability_status: z.string(),
    default_number_id: z.number().int().optional(),
    created_at: z.string(),
    time_zone: z.string()
});

const ProviderTeamSchema = z.object({
    id: z.number().int(),
    direct_link: z.string(),
    name: z.string(),
    created_at: z.string(),
    users: z.array(ProviderUserSchema)
});

const TeamSchema = z.object({
    id: z.string(),
    direct_link: z.string().optional(),
    name: z.string().optional(),
    created_at: z.string().optional(),
    users: z
        .array(
            z.object({
                id: z.string(),
                direct_link: z.string().optional(),
                name: z.string().optional(),
                email: z.string().optional(),
                availability_status: z.string().optional(),
                default_number_id: z.number().int().optional(),
                created_at: z.string().optional(),
                time_zone: z.string().optional()
            })
        )
        .optional()
});

const sync = createSync({
    description: 'Sync teams from Aircall.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    models: {
        Team: TeamSchema
    },
    endpoints: [
        {
            path: '/syncs/teams',
            method: 'GET'
        }
    ],

    exec: async (nango) => {
        // Full refresh: GET /v1/teams does not support updated_after, cursor, or since_id.
        await nango.trackDeletesStart('Team');

        const proxyConfig: ProxyConfiguration = {
            // https://developer.aircall.io/api-references/#list-all-teams
            endpoint: '/v1/teams',
            paginate: {
                type: 'offset',
                offset_name_in_request: 'page',
                offset_start_value: 1,
                offset_calculation_method: 'per-page',
                limit_name_in_request: 'per_page',
                limit: 50,
                response_path: 'teams'
            },
            retries: 3
        };

        for await (const page of nango.paginate(proxyConfig)) {
            const teams = page.map((record: unknown) => {
                const parsed = ProviderTeamSchema.safeParse(record);
                if (!parsed.success) {
                    throw new Error(`Failed to parse team: ${parsed.error.message}`);
                }
                const team = parsed.data;
                return {
                    id: String(team.id),
                    direct_link: team.direct_link,
                    name: team.name,
                    created_at: team.created_at,
                    users: team.users.map((user) => ({
                        id: String(user.id),
                        direct_link: user.direct_link,
                        name: user.name,
                        email: user.email,
                        availability_status: user.availability_status,
                        default_number_id: user.default_number_id,
                        created_at: user.created_at,
                        time_zone: user.time_zone
                    }))
                };
            });

            if (teams.length > 0) {
                await nango.batchSave(teams, 'Team');
            }
        }

        await nango.trackDeletesEnd('Team');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
