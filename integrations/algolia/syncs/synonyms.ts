import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const MetadataSchema = z.object({
    indexName: z.string()
});

const CheckpointSchema = z.object({
    indexName: z.string(),
    page: z.number().int().nonnegative()
});

const SynonymSchema = z.object({
    id: z.string(),
    objectID: z.string(),
    type: z.string(),
    corrections: z.array(z.string()).optional(),
    input: z.string().optional(),
    placeholder: z.string().optional(),
    replacements: z.array(z.string()).optional(),
    synonyms: z.array(z.string()).optional(),
    word: z.string().optional()
});

type Synonym = z.infer<typeof SynonymSchema>;

const ProviderSynonymHitSchema = z.object({
    objectID: z.string(),
    type: z.string(),
    corrections: z.array(z.string()).optional(),
    input: z.string().optional(),
    placeholder: z.string().optional(),
    replacements: z.array(z.string()).optional(),
    synonyms: z.array(z.string()).optional(),
    word: z.string().optional()
});

const sync = createSync({
    description: 'Sync synonyms from an Algolia index.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: false,
    metadata: MetadataSchema,
    checkpoint: CheckpointSchema,
    // https://www.algolia.com/doc/rest-api/search/#search-synonyms
    endpoints: [{ method: 'POST', path: '/syncs/synonyms' }],
    models: {
        Synonym: SynonymSchema
    },

    exec: async (nango) => {
        const metadata = await nango.getMetadata();

        if (!metadata?.indexName) {
            throw new Error('indexName is required in metadata');
        }

        const indexName = metadata.indexName;
        const checkpoint = await nango.getCheckpoint();
        const startPage = checkpoint?.indexName === indexName ? (checkpoint.page ?? 0) : 0;

        if (checkpoint && checkpoint.indexName !== indexName) {
            await nango.clearCheckpoint();
        }

        // Blocker: Algolia synonyms search has no changed-since or
        // deleted-synonym endpoint. We still checkpoint the current page so a
        // full refresh can resume after an interruption.
        await nango.trackDeletesStart('Synonym');

        const proxyConfig: ProxyConfiguration = {
            // https://www.algolia.com/doc/rest-api/search/#search-synonyms
            endpoint: `/1/indexes/${encodeURIComponent(indexName)}/synonyms/search`,
            method: 'POST',
            data: {},
            paginate: {
                type: 'offset',
                offset_name_in_request: 'page',
                offset_start_value: startPage,
                offset_calculation_method: 'per-page',
                limit_name_in_request: 'hitsPerPage',
                limit: 100,
                response_path: 'hits',
                on_page: async ({ nextPageParam }) => {
                    if (typeof nextPageParam === 'number') {
                        await nango.saveCheckpoint({
                            indexName,
                            page: nextPageParam + 1
                        });
                    }
                }
            },
            retries: 3
        };

        for await (const hits of nango.paginate(proxyConfig)) {
            const parsedHits = z.array(ProviderSynonymHitSchema).safeParse(hits);

            if (!parsedHits.success) {
                throw new Error(`Failed to parse synonym hits: ${parsedHits.error.message}`);
            }

            const synonyms: Synonym[] = parsedHits.data.map((hit) => ({
                id: hit.objectID,
                objectID: hit.objectID,
                type: hit.type,
                ...(hit.corrections !== undefined && { corrections: hit.corrections }),
                ...(hit.input !== undefined && { input: hit.input }),
                ...(hit.placeholder !== undefined && { placeholder: hit.placeholder }),
                ...(hit.replacements !== undefined && { replacements: hit.replacements }),
                ...(hit.synonyms !== undefined && { synonyms: hit.synonyms }),
                ...(hit.word !== undefined && { word: hit.word })
            }));

            if (synonyms.length > 0) {
                await nango.batchSave(synonyms, 'Synonym');
            }
        }

        await nango.clearCheckpoint();
        await nango.trackDeletesEnd('Synonym');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
