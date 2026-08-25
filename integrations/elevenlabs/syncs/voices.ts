import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const ProviderVoiceSchema = z
    .object({
        voice_id: z.string(),
        name: z.string().optional(),
        category: z.string().optional(),
        description: z.string().nullable().optional(),
        preview_url: z.string().nullable().optional(),
        labels: z.record(z.string(), z.string()).optional(),
        created_at_unix: z.number().nullable().optional(),
        is_legacy: z.boolean().optional(),
        is_mixed: z.boolean().optional(),
        is_owner: z.boolean().nullable().optional()
    })
    .passthrough();

const VoiceSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    category: z.string().optional(),
    description: z.string().optional(),
    preview_url: z.string().optional(),
    labels: z.record(z.string(), z.string()).optional(),
    created_at_unix: z.number().optional(),
    is_legacy: z.boolean().optional(),
    is_mixed: z.boolean().optional(),
    is_owner: z.boolean().optional()
});

const CheckpointSchema = z.object({
    next_page_token: z.string()
});

const sync = createSync({
    description: 'Sync voices.',
    version: '1.0.1',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        Voice: VoiceSchema
    },

    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint();
        let nextPageToken: string | undefined = checkpoint != null ? CheckpointSchema.parse(checkpoint).next_page_token : undefined;

        await nango.trackDeletesStart('Voice');

        const proxyConfig: ProxyConfiguration = {
            // https://elevenlabs.io/docs/api-reference/voices/search
            endpoint: '/v2/voices',
            params: {
                page_size: 100,
                ...(nextPageToken != null && { next_page_token: nextPageToken })
            },
            paginate: {
                type: 'cursor',
                cursor_name_in_request: 'next_page_token',
                cursor_path_in_response: 'next_page_token',
                response_path: 'voices',
                limit_name_in_request: 'page_size',
                limit: 100,
                on_page: async ({ nextPageParam }) => {
                    if (typeof nextPageParam === 'string') {
                        nextPageToken = nextPageParam;
                    } else {
                        nextPageToken = undefined;
                    }
                }
            },
            retries: 3
        };

        for await (const page of nango.paginate(proxyConfig)) {
            const voices = page.map((voice: unknown) => {
                const parsed = ProviderVoiceSchema.parse(voice);
                return {
                    id: parsed.voice_id,
                    ...(parsed.name != null && { name: parsed.name }),
                    ...(parsed.category != null && { category: parsed.category }),
                    ...(parsed.description != null && { description: parsed.description }),
                    ...(parsed.preview_url != null && { preview_url: parsed.preview_url }),
                    ...(parsed.labels != null && Object.keys(parsed.labels).length > 0 && { labels: parsed.labels }),
                    ...(parsed.created_at_unix != null && { created_at_unix: parsed.created_at_unix }),
                    ...(parsed.is_legacy != null && { is_legacy: parsed.is_legacy }),
                    ...(parsed.is_mixed != null && { is_mixed: parsed.is_mixed }),
                    ...(parsed.is_owner != null && { is_owner: parsed.is_owner })
                };
            });

            if (voices.length > 0) {
                await nango.batchSave(voices, 'Voice');
            }

            if (nextPageToken !== undefined) {
                await nango.saveCheckpoint({ next_page_token: nextPageToken });
            }
        }

        await nango.clearCheckpoint();
        await nango.trackDeletesEnd('Voice');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
