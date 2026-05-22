import { createSync } from 'nango';
import { z } from 'zod';

const TeamSchema = z.object({
    id: z.string(),
    name: z.string(),
    picture_url: z.string().optional()
});

const ProviderTeamSchema = z.object({
    id: z.string(),
    name: z.string(),
    picture_url: z.string().nullable().optional()
});

const ProviderResponseSchema = z.object({
    data: z.object({
        teams: z.array(ProviderTeamSchema)
    })
});

const sync = createSync({
    description: 'Sync teams from monday.com',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    // https://developer.monday.com/api-reference/reference/teams
    endpoints: [
        {
            method: 'GET',
            path: '/syncs/teams'
        }
    ],
    models: {
        Team: TeamSchema
    },

    exec: async (nango) => {
        // The monday.com teams query does not support updated_at filtering, cursors,
        // or limit/page pagination. It returns the full team list in a single request,
        // so a full refresh is the only viable strategy.
        await nango.trackDeletesStart('Team');

        // https://developer.monday.com/api-reference/reference/teams
        const response = await nango.post({
            endpoint: '/v2',
            headers: {
                'api-version': '2026-04'
            },
            data: {
                query: 'query { teams { id name picture_url } }'
            },
            retries: 3
        });

        const parsed = ProviderResponseSchema.safeParse(response.data);
        if (!parsed.success) {
            throw new Error(`Failed to parse teams response: ${parsed.error.message}`);
        }

        const teams = parsed.data.data.teams.map((team) => ({
            id: team.id,
            name: team.name,
            ...(team.picture_url != null && { picture_url: team.picture_url })
        }));

        if (teams.length > 0) {
            await nango.batchSave(teams, 'Team');
        }

        await nango.trackDeletesEnd('Team');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
