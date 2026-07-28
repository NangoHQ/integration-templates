import { createSync } from 'nango';
import { z } from 'zod';

const ProviderTeamSchema = z
    .object({
        _id: z.string(),
        name: z.string().nullable().optional(),
        companyId: z.string().nullable().optional(),
        project: z.boolean().optional(),
        deleted: z.boolean().optional()
    })
    .passthrough();

const TeamSchema = z
    .object({
        id: z.string(),
        name: z.string().optional(),
        companyId: z.string().optional(),
        project: z.boolean().optional(),
        deleted: z.boolean().optional()
    })
    .passthrough();

const sync = createSync({
    description: 'Sync teams visible to the connected user.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    models: {
        Team: TeamSchema
    },

    exec: async (nango) => {
        // https://help.ninety.io/en/articles/15505694-api-reference-and-access
        const response = await nango.get({
            endpoint: '/v1/teams',
            retries: 3
        });

        const parsed = z.array(ProviderTeamSchema).safeParse(response.data);
        if (!parsed.success) {
            throw new Error(`Failed to parse teams response: ${parsed.error.message}`);
        }

        await nango.trackDeletesStart('Team');

        const teams = parsed.data.map((team) => ({
            ...team,
            id: team._id,
            name: team.name ?? undefined,
            companyId: team.companyId ?? undefined
        }));

        if (teams.length > 0) {
            await nango.batchSave(teams, 'Team');
        }

        await nango.trackDeletesEnd('Team');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
