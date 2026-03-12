import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    filename: z.string().describe('Name of the file being uploaded. Example: "document.pdf"'),
    length: z.number().int().min(1).describe('Size of the file in bytes. Example: 1024'),
    alt_txt: z.string().optional().describe('Description of image for screen-reader. Only applicable for image files.')
});

const OutputSchema = z.object({
    upload_url: z.string().describe('The URL to upload the file content to'),
    file_id: z.string().describe('The unique file ID for this upload')
});

const action = createAction({
    description: 'Generate an external upload URL and file ID for Slack uploads',
    version: '1.0.0',

    endpoint: {
        method: 'POST',
        path: '/actions/get-upload-url',
        group: 'Files'
    },

    input: InputSchema,
    output: OutputSchema,
    scopes: ['files:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const params: Record<string, string | number> = {
            filename: input.filename,
            length: input.length
        };

        if (input['alt_txt']) {
            params['alt_txt'] = input['alt_txt'];
        }

        const response = await nango.post({
            // https://api.slack.com/methods/files.getUploadURLExternal
            endpoint: 'files.getUploadURLExternal',
            params,
            retries: 3
        });

        if (!response.data.ok) {
            throw new nango.ActionError({
                type: 'api_error',
                message: response.data.error || 'Failed to get upload URL',
                slack_error: response.data.error
            });
        }

        return {
            upload_url: response.data.upload_url,
            file_id: response.data.file_id
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
