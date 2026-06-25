import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const PronunciationDictionarySchema = z.object({
    id: z.string(),
    latest_version_id: z.string(),
    latest_version_rules_num: z.number().optional(),
    name: z.string(),
    permission_on_resource: z.string().nullable().optional(),
    created_by: z.string(),
    creation_time_unix: z.number(),
    archived_time_unix: z.number().nullable().optional(),
    description: z.string().nullable().optional()
});

const CheckpointSchema = z.object({
    cursor: z.string()
});

const sync = createSync({
    description: 'Sync pronunciation dictionaries',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    // https://elevenlabs.io/docs/api-reference/pronunciation-dictionaries/list
    endpoints: [{ method: 'GET', path: '/syncs/pronunciation-dictionaries' }],
    models: {
        PronunciationDictionary: PronunciationDictionarySchema
    },

    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint();
        const isResuming = checkpoint != null;
        let cursor: string | undefined = isResuming ? CheckpointSchema.parse(checkpoint).cursor : undefined;

        // The list endpoint only supports full snapshots, but its cursor allows
        // interrupted crawls to resume without restarting from page 1.
        // Delete tracking is skipped on resume because a partial enumeration
        // would falsely delete records from pages before the checkpoint cursor.
        if (!isResuming) {
            await nango.trackDeletesStart('PronunciationDictionary');
        }

        const proxyConfig: ProxyConfiguration = {
            // https://elevenlabs.io/docs/api-reference/pronunciation-dictionaries/list
            endpoint: '/v1/pronunciation-dictionaries',
            params: {
                ...(cursor != null && { cursor }),
                sort: 'creation_time_unix',
                sort_direction: 'ascending'
            },
            paginate: {
                type: 'cursor',
                cursor_name_in_request: 'cursor',
                cursor_path_in_response: 'next_cursor',
                response_path: 'pronunciation_dictionaries',
                limit_name_in_request: 'page_size',
                limit: 100,
                on_page: async ({ nextPageParam }) => {
                    if (typeof nextPageParam === 'string') {
                        cursor = nextPageParam;
                    } else {
                        cursor = undefined;
                    }
                }
            },
            retries: 3
        };

        for await (const page of nango.paginate(proxyConfig)) {
            const dictionaries = page.map((item) => {
                const parsed = PronunciationDictionarySchema.safeParse(item);
                if (!parsed.success) {
                    throw new Error(`Failed to parse pronunciation dictionary: ${parsed.error.message}`);
                }
                return parsed.data;
            });

            if (dictionaries.length > 0) {
                await nango.batchSave(dictionaries, 'PronunciationDictionary');
            }

            if (cursor !== undefined) {
                await nango.saveCheckpoint({ cursor });
            }
        }

        await nango.clearCheckpoint();
        if (!isResuming) {
            await nango.trackDeletesEnd('PronunciationDictionary');
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
