import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({});

const ProviderVoiceSettingsSchema = z.object({
    stability: z.number().nullable(),
    similarity_boost: z.number().nullable(),
    style: z.number().nullable(),
    use_speaker_boost: z.boolean().nullable(),
    speed: z.number().nullable()
});

const OutputSchema = z.object({
    stability: z.number().optional(),
    similarity_boost: z.number().optional(),
    style: z.number().optional(),
    use_speaker_boost: z.boolean().optional(),
    speed: z.number().optional()
});

const action = createAction({
    description: 'Get the account default voice settings.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    endpoint: {
        path: '/actions/get-default-voice-settings',
        method: 'GET'
    },

    exec: async (nango, _input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://elevenlabs.io/docs/api-reference/voices/settings/get-default
            endpoint: '/v1/voices/settings/default',
            retries: 3
        });

        const providerSettings = ProviderVoiceSettingsSchema.parse(response.data);

        return {
            ...(providerSettings.stability != null && { stability: providerSettings.stability }),
            ...(providerSettings.similarity_boost != null && { similarity_boost: providerSettings.similarity_boost }),
            ...(providerSettings.style != null && { style: providerSettings.style }),
            ...(providerSettings.use_speaker_boost != null && { use_speaker_boost: providerSettings.use_speaker_boost }),
            ...(providerSettings.speed != null && { speed: providerSettings.speed })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
