import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    voice_id: z.string().describe('Voice ID. Example: "CwhRBWXzGAHq8TQ4Fs17"')
});

const ProviderVoiceSettingsSchema = z.object({
    stability: z.number().optional(),
    similarity_boost: z.number().optional(),
    style: z.number().optional(),
    use_speaker_boost: z.boolean().optional(),
    speed: z.number().optional()
});

const OutputSchema = z.object({
    stability: z.number().optional(),
    similarity_boost: z.number().optional(),
    style: z.number().optional(),
    use_speaker_boost: z.boolean().optional(),
    speed: z.number().optional()
});

const action = createAction({
    description: 'Get settings for a specific voice.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/get-voice-settings'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://elevenlabs.io/docs/api-reference/voices/settings/get
            endpoint: `/v1/voices/${encodeURIComponent(input.voice_id)}/settings`,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Voice settings not found',
                voice_id: input.voice_id
            });
        }

        const providerSettings = ProviderVoiceSettingsSchema.parse(response.data);

        return {
            ...(providerSettings.stability !== undefined && { stability: providerSettings.stability }),
            ...(providerSettings.similarity_boost !== undefined && { similarity_boost: providerSettings.similarity_boost }),
            ...(providerSettings.style !== undefined && { style: providerSettings.style }),
            ...(providerSettings.use_speaker_boost !== undefined && { use_speaker_boost: providerSettings.use_speaker_boost }),
            ...(providerSettings.speed !== undefined && { speed: providerSettings.speed })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
