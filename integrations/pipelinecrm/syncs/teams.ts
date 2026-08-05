import { createSync, type ProxyConfiguration } from 'nango';
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
    height: z.number().optional(),
    depth: z.number().optional()
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

const sync = createSync({
    description: 'Sync teams in this account.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    models: {
        Team: TeamSchema
    },

    exec: async (nango) => {
        await nango.trackDeletesStart('Team');

        const proxyConfig: ProxyConfiguration = {
            // https://app.pipelinecrm.com/api/docs/introduction
            endpoint: '/api/v3/admin/teams',
            paginate: {
                type: 'offset',
                offset_name_in_request: 'page',
                offset_start_value: 1,
                offset_calculation_method: 'per-page',
                limit_name_in_request: 'per_page',
                limit: 100,
                response_path: 'entries'
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
        }

        await nango.trackDeletesEnd('Team');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
