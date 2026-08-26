import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const CollectionSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    description: z.string().optional(),
    url: z.string().optional(),
    created_at: z.number().optional(),
    updated_at: z.number().optional(),
    workspace_id: z.string().optional()
});

const CheckpointSchema = z.object({
    starting_after: z.string()
});

const sync = createSync({
    description: 'Sync Help Center collections and sections from Intercom.',
    version: '1.0.1',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    endpoints: [
        {
            path: '/syncs/help-center-collections',
            method: 'GET'
        }
    ],
    models: {
        Collection: CollectionSchema
    },

    exec: async (nango) => {
        // Blocker: Intercom Help Center collections endpoint does not support
        // timestamp-based filtering or incremental cursors for change detection.
        // This is a full refresh sync to capture the complete Help Center hierarchy.
        const rawCheckpoint = await nango.getCheckpoint();
        const checkpoint = rawCheckpoint ? CheckpointSchema.parse(rawCheckpoint) : undefined;
        let nextCursor: string | undefined = checkpoint?.starting_after;

        await nango.trackDeletesStart('Collection');

        const proxyConfig: ProxyConfiguration = {
            // https://developers.intercom.com/docs/references/rest-api/api.intercom.io/Collections
            endpoint: '/help_center/collections',
            headers: {
                'Intercom-Version': '2.11'
            },
            params: {
                ...(nextCursor && { starting_after: nextCursor })
            },
            paginate: {
                type: 'cursor',
                cursor_path_in_response: 'pages.next.starting_after',
                cursor_name_in_request: 'starting_after',
                limit: 150,
                limit_name_in_request: 'per_page',
                response_path: 'data',
                on_page: async ({ nextPageParam }) => {
                    nextCursor = typeof nextPageParam === 'string' ? nextPageParam : undefined;
                }
            },
            retries: 3
        };

        for await (const page of nango.paginate(proxyConfig)) {
            const collections = page
                .filter((record: unknown) => {
                    const parsed = CollectionSchema.safeParse(record);
                    if (!parsed.success) {
                        throw new Error(`Failed to parse collection: ${JSON.stringify(parsed.error.issues)}`);
                    }
                    return true;
                })
                .map((record: unknown) => {
                    const data = CollectionSchema.parse(record);
                    return {
                        id: data.id,
                        name: data.name,
                        description: data.description,
                        url: data.url,
                        created_at: data.created_at,
                        updated_at: data.updated_at,
                        workspace_id: data.workspace_id
                    };
                });

            if (collections.length > 0) {
                await nango.batchSave(collections, 'Collection');
            }

            if (nextCursor !== undefined) {
                await nango.saveCheckpoint({ starting_after: nextCursor });
            }
        }

        await nango.clearCheckpoint();
        await nango.trackDeletesEnd('Collection');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
