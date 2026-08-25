import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const ProviderCategoryGroupSchema = z.object({
    id: z.number().int(),
    label: z.string(),
    categories: z.object({
        url: z.string()
    }),
    created_at: z.string(),
    updated_at: z.string()
});

const CategoryGroupSchema = z.object({
    id: z.string(),
    label: z.string(),
    created_at: z.string(),
    updated_at: z.string()
});

const CheckpointSchema = z.object({
    cursor: z.string()
});

const sync = createSync({
    description: 'Sync analytical category groups',
    version: '1.0.1',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        CategoryGroup: CategoryGroupSchema
    },

    exec: async (nango) => {
        // Full refresh: provider exposes no changed-since filter, changelog, or deleted-record endpoint.
        const rawCheckpoint = await nango.getCheckpoint();
        const checkpoint = rawCheckpoint ? CheckpointSchema.parse(rawCheckpoint) : undefined;
        let nextCursor = checkpoint ? checkpoint['cursor'] : undefined;

        await nango.trackDeletesStart('CategoryGroup');

        const proxyConfig: ProxyConfiguration = {
            // https://pennylane.readme.io/reference/getcategorygroups
            endpoint: '/api/external/v2/category_groups',
            params: {
                ...(nextCursor ? { cursor: nextCursor } : {})
            },
            paginate: {
                type: 'cursor',
                cursor_name_in_request: 'cursor',
                cursor_path_in_response: 'next_cursor',
                response_path: 'items',
                limit_name_in_request: 'limit',
                limit: 100,
                on_page: async ({ nextPageParam }) => {
                    nextCursor = typeof nextPageParam === 'string' ? nextPageParam : undefined;
                }
            },
            retries: 3
        };

        for await (const page of nango.paginate(proxyConfig)) {
            const categoryGroups = page.map((record: unknown) => {
                const parsed = ProviderCategoryGroupSchema.safeParse(record);
                if (!parsed.success) {
                    throw new Error(`Failed to parse category group: ${parsed.error.message}`);
                }

                const group = parsed.data;
                return {
                    id: String(group.id),
                    label: group.label,
                    created_at: group.created_at,
                    updated_at: group.updated_at
                };
            });

            if (categoryGroups.length > 0) {
                await nango.batchSave(categoryGroups, 'CategoryGroup');
            }

            if (nextCursor) {
                await nango.saveCheckpoint({ cursor: nextCursor });
            }
        }

        await nango.clearCheckpoint();
        await nango.trackDeletesEnd('CategoryGroup');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
