import { z } from 'zod';
import { createAction } from 'nango';

// IMPORTANT: This endpoint requires multipart/form-data file upload which cannot
// be handled in a Nango action due to sandbox constraints (no fs, no FormData).
//
// To use this functionality, implement a proxy script at:
// openai/proxy/translate-audio.ts using @nangohq/node
//
// See: https://platform.openai.com/docs/api-reference/audio/createTranslation

const InputSchema = z.object({
    file: z.string().describe('The audio file path or URL to translate.'),
    model: z.string().optional().describe('ID of the model to use. Defaults to whisper-1.'),
    prompt: z.string().optional().describe('Optional text to guide the model.'),
    response_format: z.enum(['json', 'text', 'srt', 'verbose_json', 'vtt']).optional().describe('The format of the output.'),
    temperature: z.number().min(0).max(1).optional().describe('The sampling temperature, between 0 and 1.')
});

const OutputSchema = z.object({
    text: z.string().describe('The translated text in English.')
});

const action = createAction({
    description: 'Translate audio to English text.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/create-translation',
        group: 'Audio'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['model.request'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        throw new nango.ActionError({
            type: 'proxy_required',
            message:
                'This action requires multipart/form-data file upload which cannot be handled in a Nango action. Please use the proxy script at openai/proxy/translate-audio.ts',
            file: input.file,
            model: input.model,
            prompt: input.prompt,
            response_format: input.response_format,
            temperature: input.temperature
        });
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
