import { createSync } from 'nango';
import { z } from 'zod';

const PermissionsSchema = z.record(z.string(), z.unknown());

const ProviderTeamSchema = z.object({
    id: z.number(),
    account_id: z.number().optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional(),
    name: z.string().optional(),
    parent_id: z.number().nullable().optional(),
    permissions: PermissionsSchema.optional(),
    height: z.number().nullable().optional(),
    depth: z.number().nullable().optional()
});

const TeamSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    account_id: z.string().optional(),
    parent_id: z.string().optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional(),
    permissions: PermissionsSchema.optional(),
    height: z.number().optional(),
    depth: z.number().optional()
});

const CheckpointSchema = z.object({
    page: z.number().int().min(1)
});

const sync = createSync({
    description: 'Sync teams in this account.',
    version: '1.0.1',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        Team: TeamSchema
    },

    exec: async (nango) => {
        const rawCheckpoint = await nango.getCheckpoint();
        const checkpointResult = CheckpointSchema.nullable().safeParse(rawCheckpoint ?? null);
        if (!checkpointResult.success) {
            throw new Error(`Invalid checkpoint: ${checkpointResult.error.message}`);
        }

        const nextPage = checkpointResult.data?.page ?? 1;

        await nango.trackDeletesStart('Team');

        let currentPage = nextPage;
        let hasMore = true;

        while (hasMore) {
            const response = await nango.get({
                // https://app.pipelinecrm.com/api/docs/introduction
                endpoint: '/api/v3/admin/teams',
                params: {
                    page: currentPage,
                    per_page: 100
                },
                retries: 3
            });

            const listResult = z
                .object({
                    entries: z.array(z.unknown()),
                    pagination: z
                        .object({
                            page: z.number(),
                            pages: z.number(),
                            per_page: z.number(),
                            total: z.number()
                        })
                        .optional()
                })
                .safeParse(response.data);

            if (!listResult.success) {
                throw new Error(`Failed to parse teams list response: ${listResult.error.message}`);
            }

            const teams = listResult.data.entries.map((record: unknown) => {
                const parsed = ProviderTeamSchema.safeParse(record);
                if (!parsed.success) {
                    throw new Error(`Failed to parse team: ${parsed.error.message}`);
                }

                const team = parsed.data;
                return {
                    id: String(team.id),
                    ...(team.name != null && { name: team.name }),
                    ...(team.account_id != null && { account_id: String(team.account_id) }),
                    ...(team.parent_id != null && { parent_id: String(team.parent_id) }),
                    ...(team.created_at != null && { created_at: team.created_at }),
                    ...(team.updated_at != null && { updated_at: team.updated_at }),
                    ...(team.permissions != null && { permissions: team.permissions }),
                    ...(team.height != null && { height: team.height }),
                    ...(team.depth != null && { depth: team.depth })
                };
            });

            if (teams.length > 0) {
                await nango.batchSave(teams, 'Team');
            }

            await nango.saveCheckpoint({ page: currentPage + 1 });
            currentPage++;

            const totalPages = listResult.data.pagination?.pages;
            if (typeof totalPages === 'number' && currentPage > totalPages) {
                hasMore = false;
            } else if (listResult.data.entries.length === 0) {
                hasMore = false;
            }
        }

        await nango.clearCheckpoint();
        await nango.trackDeletesEnd('Team');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
