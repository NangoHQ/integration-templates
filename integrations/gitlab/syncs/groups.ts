import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

// Provider response schema for GitLab groups.
// https://docs.gitlab.com/api/groups/
const ProviderGroupSchema = z.object({
    id: z.number(),
    name: z.string(),
    path: z.string(),
    description: z.string().nullable(),
    visibility: z.string(),
    web_url: z.string(),
    full_name: z.string(),
    full_path: z.string(),
    created_at: z.string(),
    parent_id: z.number().nullable(),
    avatar_url: z.string().nullable(),
    archived: z.boolean(),
    lfs_enabled: z.boolean(),
    request_access_enabled: z.boolean()
});

// Normalized model schema for synced groups.
const GroupSchema = z.object({
    id: z.string(),
    name: z.string(),
    path: z.string(),
    description: z.string().optional(),
    visibility: z.string().optional(),
    web_url: z.string().optional(),
    full_name: z.string().optional(),
    full_path: z.string().optional(),
    created_at: z.string().optional(),
    parent_id: z.string().optional(),
    avatar_url: z.string().optional(),
    archived: z.boolean().optional(),
    lfs_enabled: z.boolean().optional(),
    request_access_enabled: z.boolean().optional()
});

const sync = createSync({
    description: 'Sync groups from GitLab.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    endpoints: [{ method: 'GET', path: '/syncs/groups' }],
    models: {
        Group: GroupSchema
    },

    exec: async (nango) => {
        // Blocker: GitLab groups API does not expose updated_at in responses,
        // does not support updated_at/created_at/last_activity_at ordering,
        // does not support cursor pagination for authenticated users,
        // and does not have a since_id filter parameter.
        // Full refresh is required to keep group data current and detect deletions.
        await nango.trackDeletesStart('Group');

        const proxyConfig: ProxyConfiguration = {
            // https://docs.gitlab.com/api/groups/
            endpoint: '/api/v4/groups',
            params: {
                per_page: '100'
            },
            paginate: {
                type: 'offset',
                offset_name_in_request: 'page',
                offset_start_value: 1,
                offset_calculation_method: 'per-page',
                limit_name_in_request: 'per_page',
                limit: 100
            },
            retries: 3
        };

        for await (const page of nango.paginate(proxyConfig)) {
            const parsed = z.array(ProviderGroupSchema).safeParse(page);
            if (!parsed.success) {
                throw new Error(`Failed to parse groups page: ${parsed.error.message}`);
            }

            const groups = parsed.data.map((group) => ({
                id: String(group.id),
                name: group.name,
                path: group.path,
                ...(group.description != null && { description: group.description }),
                visibility: group.visibility,
                web_url: group.web_url,
                full_name: group.full_name,
                full_path: group.full_path,
                created_at: group.created_at,
                ...(group.parent_id != null && { parent_id: String(group.parent_id) }),
                ...(group.avatar_url != null && { avatar_url: group.avatar_url }),
                archived: group.archived,
                lfs_enabled: group.lfs_enabled,
                request_access_enabled: group.request_access_enabled
            }));

            if (groups.length > 0) {
                await nango.batchSave(groups, 'Group');
            }
        }

        await nango.trackDeletesEnd('Group');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
