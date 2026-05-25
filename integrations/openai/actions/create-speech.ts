import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    model: z.enum(['tts-1', 'tts-1-hd', 'gpt-4o-mini-tts']).describe('TTS model to use. Example: "tts-1"'),
    input: z.string().max(4096).describe('Text to synthesize into speech. Max 4096 characters. Example: "Hello world"'),
    voice: z.enum(['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer']).describe('Voice to use for synthesis. Example: "alloy"'),
    response_format: z.enum(['mp3', 'opus', 'aac', 'flac', 'wav', 'pcm']).optional().describe('Audio format. Defaults to "mp3".'),
    speed: z.number().min(0.25).max(4.0).optional().describe('Speech speed. 0.25 to 4.0. Defaults to 1.0.')
});

const OutputSchema = z.object({
    audio_data: z.string().describe('Base64-encoded audio content.'),
    content_type: z.string().describe('MIME type of the audio format.')
});

const action = createAction({
    description: 'Generate speech audio from text.',
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
        // https://platform.openai.com/docs/api-reference/audio/createSpeech
        const response = await nango.post({
            endpoint: '/v1/audio/speech',
            data: {
                model: input.model,
                input: input.input,
                voice: input.voice,
                ...(input.response_format !== undefined && {
                    response_format: input.response_format
                }),
                ...(input.speed !== undefined && { speed: input.speed })
            },
            retries: 3,
            responseType: 'arraybuffer'
        });

        const audioBuffer = Buffer.from(response.data);
        const audioData = audioBuffer.toString('base64');

        const formatToContentType: Record<string, string> = {
            mp3: 'audio/mpeg',
            opus: 'audio/opus',
            aac: 'audio/aac',
            flac: 'audio/flac',
            wav: 'audio/wav',
            pcm: 'audio/pcm'
        };

        const responseFormat = input.response_format || 'mp3';
        const contentType = formatToContentType[responseFormat] || 'audio/mpeg';

        return {
            audio_data: audioData,
            content_type: contentType
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
