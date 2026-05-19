import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    model: z.enum(['tts-1', 'tts-1-hd', 'gpt-4o-mini-tts']).describe('The text-to-speech model to use. Example: "tts-1"'),
    input: z.string().max(4096).describe('The text to generate audio for. Maximum 4096 characters. Example: "Hello world"'),
    voice: z.enum(['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer']).describe('The voice to use. Example: "alloy"'),
    response_format: z.enum(['mp3', 'opus', 'aac', 'flac', 'wav', 'pcm']).optional().describe('The format of the audio output. Default: "mp3"'),
    speed: z.number().min(0.25).max(4.0).optional().describe('The speed of the generated audio. Range: 0.25 to 4.0. Default: 1.0')
});

const OutputSchema = z.object({
    content_type: z.string().describe('The MIME type of the audio content. Example: "audio/mpeg"'),
    data: z.string().describe('The base64-encoded audio data')
});

const action = createAction({
    description: 'Generate speech audio from text',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/create-speech',
        group: 'Audio'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['model.request'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const requestBody: Record<string, unknown> = {
            model: input.model,
            input: input.input,
            voice: input.voice
        };

        if (input.response_format !== undefined) {
            requestBody['response_format'] = input.response_format;
        }

        if (input.speed !== undefined) {
            requestBody['speed'] = input.speed;
        }

        // https://platform.openai.com/docs/api-reference/audio/createSpeech
        const response = await nango.post({
            endpoint: '/v1/audio/speech',
            data: requestBody,
            responseType: 'arraybuffer',
            retries: 3
        });

        const contentType = String(response.headers['content-type'] || 'audio/mpeg');

        let binaryData: Buffer;
        if (Buffer.isBuffer(response.data)) {
            binaryData = response.data;
        } else if (response.data instanceof ArrayBuffer) {
            binaryData = Buffer.from(response.data);
        } else {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Expected binary response from audio/speech endpoint'
            });
        }

        const base64Data = binaryData.toString('base64');

        return {
            content_type: contentType,
            data: base64Data
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
