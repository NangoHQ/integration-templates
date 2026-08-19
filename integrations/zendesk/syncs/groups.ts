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

type Group = z.infer<typeof GroupSchema>;

// https://developer.zendesk.com/api-reference/ticketing/groups/groups/#list-groups
const GroupsResponseSchema = z.object({
    groups: z.array(z.unknown()),
    next_page: z.string().nullable().optional(),
    previous_page: z.string().nullable().optional(),
    count: z.number().optional()
});

const CheckpointSchema = z.object({
    page: z.number()
});

const sync = createSync({
    description: 'Sync support groups from Zendesk.',
    version: '1.0.0',
    endpoints: [{ method: 'POST', path: '/syncs/groups', group: 'Groups' }],
    frequency: 'every hour',
    autoStart: true,
    syncType: 'full',
    checkpoint: CheckpointSchema,

    models: {
        Group: GroupSchema
    },

    exec: async (nango) => {
        // Blocker: Groups endpoint supports pagination but no delta/changed-since filter.
        // The API returns all groups on every request.
        // Full refresh with trackDeletesStart/trackDeletesEnd is appropriate.

        const rawCheckpoint = await nango.getCheckpoint();
        let currentPage = 1;
        if (rawCheckpoint) {
            const parsedCheckpoint = CheckpointSchema.safeParse(rawCheckpoint);
            if (!parsedCheckpoint.success) {
                throw new Error(`Invalid checkpoint: ${JSON.stringify(parsedCheckpoint.error.issues)}`);
            }
            currentPage = parsedCheckpoint.data.page;
        }

        await nango.trackDeletesStart('Group');

        let hasMorePages = true;

        while (hasMorePages) {
            const response = await nango.get({
                // https://developer.zendesk.com/api-reference/ticketing/groups/groups/#list-groups
                endpoint: '/api/v2/groups',
                params: {
                    exclude_deleted: 'false',
                    page: String(currentPage),
                    per_page: '100'
                },
                retries: 3
            });

            const parsed = GroupsResponseSchema.safeParse(response.data);
            if (!parsed.success) {
                throw new Error(`Failed to parse groups response: ${JSON.stringify(parsed.error.issues)}`);
            }

            const { groups, next_page } = parsed.data;

            const mappedGroups: Group[] = [];
            for (const record of groups) {
                const parseResult = ProviderGroupSchema.safeParse(record);
                if (!parseResult.success) {
                    throw new Error(`Failed to parse group: ${JSON.stringify(parseResult.error.issues)}`);
                }

                const group = parseResult.data;
                mappedGroups.push({
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

            if (mappedGroups.length > 0) {
                await nango.batchSave(mappedGroups, 'Group');
            }

            if (next_page) {
                currentPage++;
                await nango.saveCheckpoint({ page: currentPage });
            } else {
                hasMorePages = false;
            }
        }

        await nango.clearCheckpoint();
        await nango.trackDeletesEnd('Group');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
