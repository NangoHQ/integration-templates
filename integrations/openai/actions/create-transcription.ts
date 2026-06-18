import { z } from 'zod';
import { createAction } from 'nango';

/**
 * Create Transcription Action
 *
 * IMPORTANT: This action interface documents the OpenAI audio transcription API.
 * Actual file uploads require multipart/form-data and must use the proxy script:
 *
 *   openai/proxy/transcribe-audio.ts
 *
 * The proxy script handles the actual file upload via @nangohq/node SDK.
 *
 * API Docs: https://platform.openai.com/docs/api-reference/audio/create-transcription
 *
 * Required inputs for proxy:
 *   - filePath: Path to local audio file (supported: flac, mp3, mp4, mpeg, mpga, m4a, ogg, wav, webm)
 *   - model: 'whisper-1' or 'gpt-4o-transcribe'
 *
 * Optional inputs:
 *   - language: ISO-639-1 code (e.g., 'en', 'es')
 *   - prompt: Optional text to guide the transcription
 *   - response_format: 'json' | 'text' | 'srt' | 'verbose_json' | 'vtt'
 *   - temperature: Sampling temperature (0-1)
 *
 * Note: Requires billing quota.
 */

const TranscriptionInputSchema = z.object({
    filePath: z.string().describe('Local path to audio file (flac, mp3, mp4, mpeg, mpga, m4a, ogg, wav, webm, max 25MB)'),
    model: z.enum(['whisper-1', 'gpt-4o-transcribe']).describe('Transcription model to use'),
    language: z.string().optional().describe('ISO-639-1 language code (e.g., "en", "es")'),
    prompt: z.string().optional().describe('Optional prompt to guide transcription style'),
    response_format: z.enum(['json', 'text', 'srt', 'verbose_json', 'vtt']).optional().describe('Output format'),
    temperature: z.number().min(0).max(1).optional().describe('Sampling temperature')
});

const TranscriptionOutputSchema = z.object({
    text: z.string().describe('Transcribed text'),
    note: z.string().optional().describe('Implementation note about proxy requirement')
});

const action = createAction({
    description: 'Transcribe audio to text. Use proxy script openai/proxy/transcribe-audio.ts for actual file uploads.',
    version: '1.0.1',
    input: TranscriptionInputSchema,
    output: TranscriptionOutputSchema,
    scopes: ['model.request'],

    exec: async (nango, input): Promise<z.infer<typeof TranscriptionOutputSchema>> => {
        // https://platform.openai.com/docs/api-reference/audio/create-transcription
        // File uploads require multipart/form-data which is not supported in Nango actions.
        // Use the proxy script at openai/proxy/transcribe-audio.ts for actual file uploads.

        await nango.log('File uploads require multipart/form-data. Use openai/proxy/transcribe-audio.ts for actual transcription with file: ' + input.filePath);

        return {
            text: '[Use proxy script openai/proxy/transcribe-audio.ts for actual audio transcription]',
            note: 'File uploads require proxy script. See openai/proxy/transcribe-audio.ts'
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
