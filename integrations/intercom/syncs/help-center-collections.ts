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

const sync = createSync({
    description: 'Sync Help Center collections and sections from Intercom.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
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
        await nango.trackDeletesStart('Collection');

        const proxyConfig: ProxyConfiguration = {
            // https://developers.intercom.com/docs/references/rest-api/api.intercom.io/Collections
            endpoint: '/help_center/collections',
            headers: {
                'Intercom-Version': '2.11'
            },
            paginate: {
                type: 'cursor',
                cursor_path_in_response: 'pages.next.starting_after',
                cursor_name_in_request: 'starting_after',
                limit: 150,
                limit_name_in_request: 'per_page',
                response_path: 'data'
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
        }

        await nango.trackDeletesEnd('Collection');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
