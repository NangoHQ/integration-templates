import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    voice_id: z.string().describe('ID of the voice to be used. Example: "29vD33N1CtxCmqQRPOHJ"'),
    stability: z.number().min(0).max(1).optional().describe('Determines how stable the voice is and the randomness between each generation. Defaults to 0.5'),
    use_speaker_boost: z.boolean().optional().describe('Boosts the similarity to the original speaker. Defaults to true'),
    similarity_boost: z.number().min(0).max(1).optional().describe('Determines how closely the AI should adhere to the original voice. Defaults to 0.75'),
    style: z.number().optional().describe('Determines the style exaggeration of the voice. Defaults to 0'),
    speed: z.number().optional().describe('Adjusts the speed of the voice. Defaults to 1')
});

const ProviderResponseSchema = z.object({
    status: z.string()
});

const OutputSchema = z.object({
    status: z.string().describe('The status of the voice settings edit request. If the request was successful, the status will be "ok".')
});

const action = createAction({
    description: 'Update voice settings',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['voices:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const data: Record<string, unknown> = {};

        if (input.stability !== undefined) {
            data['stability'] = input.stability;
        }
        if (input.use_speaker_boost !== undefined) {
            data['use_speaker_boost'] = input.use_speaker_boost;
        }
        if (input.similarity_boost !== undefined) {
            data['similarity_boost'] = input.similarity_boost;
        }
        if (input.style !== undefined) {
            data['style'] = input.style;
        }
        if (input.speed !== undefined) {
            data['speed'] = input.speed;
        }

        const response = await nango.post({
            // https://elevenlabs.io/docs/api-reference/voices/settings/update
            endpoint: `/v1/voices/${encodeURIComponent(input.voice_id)}/settings/edit`,
            data,
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        return {
            status: providerResponse.status
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
