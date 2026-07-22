import { createSync } from 'nango';
import { z } from 'zod';

const ProviderTeamSchema = z.object({
    id: z.string(),
    name: z.string().nullable(),
    slug: z.string(),
    avatar: z.string().nullable(),
    createdAt: z.number(),
    creatorId: z.string().optional(),
    description: z.string().nullable().optional(),
    stagingPrefix: z.string().optional(),
    updatedAt: z.number().optional(),
    limited: z.boolean().optional(),
    limitedBy: z.string().optional()
});

const TeamSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    slug: z.string(),
    avatar: z.string().optional(),
    createdAt: z.number(),
    creatorId: z.string().optional(),
    description: z.string().optional(),
    stagingPrefix: z.string().optional(),
    updatedAt: z.number().optional(),
    limited: z.boolean().optional(),
    limitedBy: z.string().optional()
});

const CheckpointSchema = z.object({
    next: z.number()
});

const TeamListResponseSchema = z.object({
    teams: z.array(ProviderTeamSchema),
    pagination: z
        .object({
            next: z.number().nullable().optional()
        })
        .optional()
});

const sync = createSync({
    description: 'Sync teams.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        Team: TeamSchema
    },

    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint();
        let until = checkpoint?.next;

        // Blocker: /v2/teams has cursor pagination but no updated-since filter or
        // deleted-record feed. Keep the full snapshot strategy and use the cursor
        // only to resume interrupted crawls.

        await nango.trackDeletesStart('Team');

        while (true) {
            // https://vercel.com/docs/rest-api/teams/list-all-teams
            const response = await nango.get({
                endpoint: '/v2/teams',
                params: {
                    limit: 100,
                    ...(until !== undefined && { until })
                },
                retries: 3
            });

            const parsed = TeamListResponseSchema.safeParse(response.data);
            if (!parsed.success) {
                throw new Error(`Failed to parse teams response: ${parsed.error.message}`);
            }

            const teams = parsed.data.teams.map((team) => ({
                id: team.id,
                ...(team.name != null && { name: team.name }),
                slug: team.slug,
                ...(team.avatar != null && { avatar: team.avatar }),
                createdAt: team.createdAt,
                ...(team.creatorId != null && { creatorId: team.creatorId }),
                ...(team.description != null && { description: team.description }),
                ...(team.stagingPrefix != null && { stagingPrefix: team.stagingPrefix }),
                ...(team.updatedAt != null && { updatedAt: team.updatedAt }),
                ...(team.limited != null && { limited: team.limited }),
                ...(team.limitedBy != null && { limitedBy: team.limitedBy })
            }));

            if (teams.length > 0) {
                await nango.batchSave(teams, 'Team');
            }

            const next = parsed.data.pagination?.next ?? undefined;
            if (next === undefined) {
                break;
            }

            until = next;
            await nango.saveCheckpoint({ next: until });
        }

        await nango.clearCheckpoint();
        await nango.trackDeletesEnd('Team');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
