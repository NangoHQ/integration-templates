import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    file_id: z.string().describe('The ID of the file to download. Example: "123456789"')
});

const OutputSchema = z.object({
    content: z.string().describe('The file content as a base64-encoded string'),
    file_id: z.string().describe('The ID of the downloaded file')
});

const action = createAction({
    description: 'Download file content from Box',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['root_readwrite'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://developer.box.com/reference/get-files-id-content/
            endpoint: `/2.0/files/${input.file_id}/content`,
            responseType: 'arraybuffer',
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'File not found or download failed',
                file_id: input.file_id
            });
        }

        let buffer: Buffer;
        if (response.data instanceof ArrayBuffer) {
            buffer = Buffer.from(response.data);
        } else if (Buffer.isBuffer(response.data)) {
            buffer = response.data;
        } else if (typeof response.data === 'string') {
            buffer = Buffer.from(response.data, 'utf-8');
        } else if (
            response.data !== null &&
            typeof response.data === 'object' &&
            'type' in response.data &&
            response.data.type === 'Buffer' &&
            'data' in response.data &&
            Array.isArray(response.data.data)
        ) {
            const dataArray = response.data.data;
            buffer = Buffer.from(dataArray);
        } else {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Expected binary response from file download',
                file_id: input.file_id
            });
        }

        const base64Content = buffer.toString('base64');

        return {
            content: base64Content,
            file_id: input.file_id
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
