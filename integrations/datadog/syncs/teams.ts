import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const TeamSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    handle: z.string().optional(),
    description: z.string().optional(),
    avatar: z.string().optional(),
    banner: z.number().int().optional(),
    visible_modules: z.array(z.string()).optional(),
    hidden_modules: z.array(z.string()).optional(),
    created_at: z.string().optional(),
    modified_at: z.string().optional()
});

const ProviderTeamAttributesSchema = z
    .object({
        name: z.string().optional().nullable(),
        handle: z.string().optional().nullable(),
        description: z.string().optional().nullable(),
        avatar: z.string().optional().nullable(),
        banner: z.number().int().optional().nullable(),
        visible_modules: z.array(z.string()).optional().nullable(),
        hidden_modules: z.array(z.string()).optional().nullable(),
        created_at: z.string().optional().nullable(),
        modified_at: z.string().optional().nullable()
    })
    .passthrough();

const ProviderTeamSchema = z.object({
    id: z.string(),
    type: z.string(),
    attributes: ProviderTeamAttributesSchema
});

const CheckpointSchema = z.object({
    page: z.number().int().nonnegative()
});

const sync = createSync({
    description: 'Sync teams in this organization.',
    version: '1.0.1',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        Team: TeamSchema
    },

    exec: async (nango) => {
        // Blocker: GET v2/team does not support a changed-since filter,
        // a deleted-record endpoint, or a resumable cursor.
        // Full refresh with offset pagination checkpoint.
        const rawCheckpoint = await nango.getCheckpoint();
        let page: number | undefined = 0;
        if (rawCheckpoint !== null && rawCheckpoint !== undefined) {
            const checkpointResult = CheckpointSchema.safeParse(rawCheckpoint);
            if (!checkpointResult.success) {
                throw new Error(`Invalid checkpoint: ${checkpointResult.error.message}`);
            }
            page = checkpointResult.data.page;
        }

        await nango.trackDeletesStart('Team');

        const proxyConfig: ProxyConfiguration = {
            // https://docs.datadoghq.com/api/latest/teams/#get-all-teams
            endpoint: 'v2/team',
            paginate: {
                type: 'offset',
                offset_name_in_request: 'page[number]',
                offset_start_value: page,
                offset_calculation_method: 'per-page',
                limit_name_in_request: 'page[size]',
                limit: 100,
                response_path: 'data',
                on_page: async ({ nextPageParam }) => {
                    page = typeof nextPageParam === 'number' ? nextPageParam : undefined;
                }
            },
            retries: 3
        };

        for await (const pageResults of nango.paginate(proxyConfig)) {
            if (!Array.isArray(pageResults)) {
                throw new Error('Expected paginated page to be an array');
            }

            const teams = pageResults.map((item) => {
                const parsed = ProviderTeamSchema.safeParse(item);
                if (!parsed.success) {
                    throw new Error(`Failed to parse team: ${parsed.error.message}`);
                }
                return parsed.data;
            });

            const records = teams.map((team) => ({
                id: team.id,
                ...(team.attributes.name != null && { name: team.attributes.name }),
                ...(team.attributes.handle != null && { handle: team.attributes.handle }),
                ...(team.attributes.description != null && { description: team.attributes.description }),
                ...(team.attributes.avatar != null && { avatar: team.attributes.avatar }),
                ...(team.attributes.banner != null && { banner: team.attributes.banner }),
                ...(team.attributes.visible_modules != null && { visible_modules: team.attributes.visible_modules }),
                ...(team.attributes.hidden_modules != null && { hidden_modules: team.attributes.hidden_modules }),
                ...(team.attributes.created_at != null && { created_at: team.attributes.created_at }),
                ...(team.attributes.modified_at != null && { modified_at: team.attributes.modified_at })
            }));

            if (records.length > 0) {
                await nango.batchSave(records, 'Team');
            }

            if (page !== undefined) {
                await nango.saveCheckpoint({ page });
            }
        }

        await nango.clearCheckpoint();
        await nango.trackDeletesEnd('Team');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
