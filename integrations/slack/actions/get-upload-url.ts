/**
 * Instructions: Gets a URL for uploading files to Slack
 * API: https://api.slack.com/methods/files.getUploadURLExternal
 */
import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const Input = z.object({
    filename: z.string()
        .describe('Name of the file to upload. Example: "document.pdf"'),
    length: z.number()
        .describe('Size of the file in bytes. Example: 1024')
});

const Output = z.object({
    ok: z.boolean()
        .describe('Whether the request was successful'),
    upload_url: z.string()
        .describe('The URL to upload the file to'),
    file_id: z.string()
        .describe('The file ID to use when completing the upload')
});

const action = createAction({
    description: 'Gets a URL for uploading files to Slack.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/get-upload-url',
        group: 'Actions'
    },
    input: Input,
    output: Output,
    scopes: ['files:write'],
    exec: async (nango, input): Promise<z.infer<typeof Output>> => {
        const config: ProxyConfiguration = {
            endpoint: 'files.getUploadURLExternal',
            params: {
                filename: input.filename,
                length: input.length.toString()
            },
            retries: 3
        };
        const response = await nango.get(config);
        return {
            ok: response.data.ok,
            upload_url: response.data.upload_url,
            file_id: response.data.file_id
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
