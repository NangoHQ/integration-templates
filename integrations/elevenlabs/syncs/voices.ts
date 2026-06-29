import { createSync } from 'nango';
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

const ProviderResponseSchema = z.object({
    voices: z.array(ProviderVoiceSchema)
});

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

const sync = createSync({
    description: 'Sync voices.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    models: {
        Voice: VoiceSchema
    },

    exec: async (nango) => {
        // Blocker: provider only exposes /v1/voices with no changed-since filter,
        // no deleted-record endpoint, and no resumable cursor.

        // https://elevenlabs.io/docs/api-reference/legacy/voices/get-all
        const response = await nango.get({
            endpoint: '/v1/voices',
            retries: 3
        });

        const parsed = ProviderResponseSchema.safeParse(response.data);
        if (!parsed.success) {
            throw new Error(`Failed to parse voices response: ${parsed.error.message}`);
        }

        await nango.trackDeletesStart('Voice');

        const voices = parsed.data.voices.map((voice) => ({
            id: voice.voice_id,
            ...(voice.name != null && { name: voice.name }),
            ...(voice.category != null && { category: voice.category }),
            ...(voice.description != null && { description: voice.description }),
            ...(voice.preview_url != null && { preview_url: voice.preview_url }),
            ...(voice.labels != null && Object.keys(voice.labels).length > 0 && { labels: voice.labels }),
            ...(voice.created_at_unix != null && { created_at_unix: voice.created_at_unix }),
            ...(voice.is_legacy != null && { is_legacy: voice.is_legacy }),
            ...(voice.is_mixed != null && { is_mixed: voice.is_mixed }),
            ...(voice.is_owner != null && { is_owner: voice.is_owner })
        }));

        if (voices.length > 0) {
            await nango.batchSave(voices, 'Voice');
        }

        await nango.trackDeletesEnd('Voice');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
