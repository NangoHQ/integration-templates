import type { ProxyConfiguration } from 'nango';
import { createSync } from 'nango';
import { z } from 'zod';

// Provider schema matching Zendesk API response
// https://developer.zendesk.com/api-reference/ticketing/groups/groups/
const ProviderGroupSchema = z.object({
    id: z.number(),
    name: z.string(),
    description: z.string().nullable().optional(),
    default: z.boolean().optional(),
    deleted: z.boolean().optional(),
    is_public: z.boolean().optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional(),
    url: z.string().optional()
});

// Normalized model schema
const GroupSchema = z.object({
    id: z.string(),
    name: z.string(),
    description: z.string().optional(),
    isDefault: z.boolean().optional(),
    isDeleted: z.boolean().optional(),
    isPublic: z.boolean().optional(),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional(),
    url: z.string().optional()
});

type ProviderGroup = z.infer<typeof ProviderGroupSchema>;
type Group = z.infer<typeof GroupSchema>;

const sync = createSync({
    description: 'Sync support groups from Zendesk.',
    version: '1.0.0',
    endpoints: [{ method: 'POST', path: '/syncs/groups', group: 'Groups' }],
    frequency: 'every hour',
    autoStart: true,
    syncType: 'full',

    models: {
        Group: GroupSchema
    },

    exec: async (nango) => {
        // Blocker: Groups endpoint supports pagination but no delta/changed-since filter.
        // The API returns all groups on every request.
        // Full refresh with trackDeletesStart/trackDeletesEnd is appropriate.
        await nango.trackDeletesStart('Group');

        const proxyConfig: ProxyConfiguration = {
            // https://developer.zendesk.com/api-reference/ticketing/groups/groups/#list-groups
            endpoint: '/api/v2/groups',
            params: {
                exclude_deleted: 'false'
            },
            paginate: {
                type: 'offset',
                offset_name_in_request: 'page',
                offset_start_value: 1,
                offset_calculation_method: 'per-page',
                limit_name_in_request: 'per_page',
                limit: 100,
                response_path: 'groups'
            },
            retries: 3
        };

        try {
            for await (const page of nango.paginate<ProviderGroup>(proxyConfig)) {
                const groups: Group[] = [];

                for (const record of page) {
                    const parseResult = ProviderGroupSchema.safeParse(record);
                    if (!parseResult.success) {
                        throw new Error(`Failed to parse group: ${JSON.stringify(parseResult.error.issues)}`);
                    }

                    const group = parseResult.data;
                    groups.push({
                        id: String(group.id),
                        name: group.name,
                        ...(group.description && { description: group.description }),
                        ...(group.default !== undefined && { isDefault: group.default }),
                        ...(group.deleted !== undefined && { isDeleted: group.deleted }),
                        ...(group.is_public !== undefined && { isPublic: group.is_public }),
                        ...(group.created_at && { createdAt: group.created_at }),
                        ...(group.updated_at && { updatedAt: group.updated_at }),
                        ...(group.url && { url: group.url })
                    });
                }

                if (groups.length > 0) {
                    await nango.batchSave(groups, 'Group');
                }
            }
        } finally {
            await nango.trackDeletesEnd('Group');
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
