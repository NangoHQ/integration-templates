/**
 * Instructions: Finalizes and optionally shares an uploaded file
 * API: https://api.slack.com/methods/files.completeUploadExternal
 */
import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const Input = z.object({
    files: z.array(z.any())
        .describe('Array of file objects with id and title. Example: [{"id": "F0123ABC", "title": "My File"}]'),
    channel_id: z.string().optional()
        .describe('Channel to share the file to. Example: "C02MB5ZABA7"')
});

const Output = z.object({
    ok: z.boolean()
        .describe('Whether the upload was completed successfully'),
    files: z.array(z.any())
        .describe('Array of completed file objects')
});

const action = createAction({
    description: 'Finalizes and optionally shares an uploaded file.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/complete-file-upload',
        group: 'Actions'
    },
    input: Input,
    output: Output,
    scopes: ['files:write'],
    exec: async (nango, input): Promise<z.infer<typeof Output>> => {
        const config: ProxyConfiguration = {
            // https://api.slack.com/methods/files.completeUploadExternal
            endpoint: 'files.completeUploadExternal',
            data: {
                files: input.files,
                ...(input.channel_id && { channel_id: input.channel_id })
            },
            retries: 3
        };
        const response = await nango.post(config);
        return {
            ok: response.data.ok,
            files: response.data.files
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
