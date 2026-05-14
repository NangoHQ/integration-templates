import { createSync } from 'nango';
import { z } from 'zod';

// https://learn.microsoft.com/graph/api/user-list-joinedteams
const _ProviderTeamSchema = z.object({
    id: z.string(),
    displayName: z.string().nullable().optional(),
    description: z.string().nullable().optional(),
    isArchived: z.boolean().nullable().optional(),
    tenantId: z.string().nullable().optional()
});

const JoinedTeamSchema = z.object({
    id: z.string(),
    displayName: z.string().optional(),
    description: z.string().optional(),
    isArchived: z.boolean().optional(),
    tenantId: z.string().optional()
});

const ProviderTeamsResponseSchema = z.object({
    value: z.array(_ProviderTeamSchema),
    '@odata.nextLink': z.string().optional()
});

const CheckpointSchema = z.object({
    nextLink: z.string()
});

const sync = createSync({
    description: 'Sync the teams joined by a user',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        JoinedTeam: JoinedTeamSchema
    },
    // https://learn.microsoft.com/graph/api/user-list-joinedteams
    endpoints: [
        {
            path: '/syncs/joined-teams',
            method: 'GET'
        }
    ],

    exec: async (nango) => {
        // Reset pagination so a resumed run always scans from page 1 — skipping
        // earlier pages would cause trackDeletesEnd to falsely delete those records.
        await nango.saveCheckpoint({ nextLink: '' });
        await nango.trackDeletesStart('JoinedTeam');

        let nextLink: string | undefined = '/v1.0/me/joinedTeams';

        try {
            while (nextLink) {
                // https://learn.microsoft.com/graph/api/user-list-joinedteams
                const response = await nango.get({
                    endpoint: nextLink,
                    retries: 3
                });

                const parsed = ProviderTeamsResponseSchema.parse(response.data);
                const mappedTeams = parsed.value
                    .filter((team) => team.id !== '')
                    .map((team) => {
                        const result: z.infer<typeof JoinedTeamSchema> = {
                            id: team.id
                        };
                        if (team.displayName !== null && team.displayName !== undefined) {
                            result.displayName = team.displayName;
                        }
                        if (team.description !== null && team.description !== undefined) {
                            result.description = team.description;
                        }
                        if (team.isArchived !== null && team.isArchived !== undefined) {
                            result.isArchived = team.isArchived;
                        }
                        if (team.tenantId !== null && team.tenantId !== undefined) {
                            result.tenantId = team.tenantId;
                        }
                        return result;
                    });

                if (mappedTeams.length > 0) {
                    await nango.batchSave(mappedTeams, 'JoinedTeam');
                }

                nextLink = parsed['@odata.nextLink'];

                if (nextLink) {
                    await nango.saveCheckpoint({ nextLink });
                }
            }
        } finally {
            await nango.saveCheckpoint({ nextLink: '' });
            await nango.trackDeletesEnd('JoinedTeam');
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
