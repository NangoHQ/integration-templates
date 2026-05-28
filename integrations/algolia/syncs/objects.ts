import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const ObjectSchema = z
    .object({
        id: z.string()
    })
    .passthrough();

const BrowseHitSchema = z
    .object({
        objectID: z.string()
    })
    .passthrough();

const MetadataSchema = z.object({
    indexName: z.string()
});

const CheckpointSchema = z.object({
    indexName: z.string(),
    cursor: z.string()
});

const sync = createSync({
    description: 'Sync objects from an Algolia index',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: false,
    metadata: MetadataSchema,
    checkpoint: CheckpointSchema,
    endpoints: [{ method: 'POST', path: '/syncs/objects' }],
    models: {
        Object: ObjectSchema
    },

    exec: async (nango) => {
        const metadata = await nango.getMetadata();
        if (!metadata?.indexName) {
            throw new Error('indexName is required in metadata');
        }
        const indexName = metadata.indexName;
        const checkpoint = await nango.getCheckpoint();
        const resumeCursor = checkpoint?.indexName === indexName ? checkpoint.cursor : undefined;

        if (checkpoint && checkpoint.indexName !== indexName) {
            await nango.clearCheckpoint();
        }

        // Blocker: Algolia browse is a full refresh with no changed-since or
        // deleted-object endpoint, but the browse cursor lets us resume an
        // interrupted pass safely.
        await nango.trackDeletesStart('Object');

        const proxyConfig: ProxyConfiguration = {
            // https://www.algolia.com/doc/rest-api/search/#browse-index
            endpoint: `/1/indexes/${encodeURIComponent(indexName)}/browse`,
            ...(resumeCursor
                ? {
                      params: {
                          cursor: resumeCursor
                      }
                  }
                : {}),
            paginate: {
                type: 'cursor',
                cursor_name_in_request: 'cursor',
                cursor_path_in_response: 'cursor',
                response_path: 'hits',
                limit_name_in_request: 'hitsPerPage',
                limit: 1000,
                on_page: async ({ nextPageParam }) => {
                    if (typeof nextPageParam === 'string' && nextPageParam) {
                        await nango.saveCheckpoint({
                            indexName,
                            cursor: nextPageParam
                        });
                    }
                }
            },
            retries: 3
        };

        for await (const page of nango.paginate(proxyConfig)) {
            const hits = z.array(BrowseHitSchema).parse(page);
            const records = hits.map((hit) => ({
                ...hit,
                id: hit.objectID
            }));

            if (records.length > 0) {
                await nango.batchSave(records, 'Object');
            }
        }

        await nango.clearCheckpoint();
        await nango.trackDeletesEnd('Object');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
