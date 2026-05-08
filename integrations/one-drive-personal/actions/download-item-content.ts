import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    item_id: z.string().describe('The ID of the file item to download. Example: "01A2B3C4D5E6F7G8H9I0J1K2L3M4N5O6P7Q8R9S0T1U2V3W4X5Y6Z7A8B9C0D1E2F3"')
});

const OutputSchema = z.object({
    content: z.string().describe('Base64-encoded binary content of the file'),
    content_type: z.string().describe('MIME type of the file content'),
    size: z.number().describe('Size of the file content in bytes'),
    name: z.string().optional().describe('Name of the file')
});

const action = createAction({
    description: 'Download the binary content of a file',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/download-item-content',
        group: 'Files'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['onedrive.readonly'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://learn.microsoft.com/onedrive/developer/rest-api/api/driveitem_get_content
        const response = await nango.get({
            endpoint: `/v1.0/drive/items/${encodeURIComponent(input.item_id)}/content`,
            responseType: 'arraybuffer',
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'File content not found',
                item_id: input.item_id
            });
        }

        // Convert ArrayBuffer to base64 string
        const data = response.data;
        if (typeof data === 'string') {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Expected binary response but received string'
            });
        }
        const buffer = Buffer.from(data);
        const base64Content = buffer.toString('base64');

        // Extract content type from headers
        const contentType = response.headers['content-type'] || 'application/octet-stream';

        // Try to get filename from Content-Disposition header if available
        const contentDisposition = response.headers['content-disposition'];
        let filename: string | undefined;
        if (contentDisposition) {
            const match = contentDisposition.match(/filename="?([^"]+)"?/);
            if (match) {
                filename = match[1];
            }
        }

        return {
            content: base64Content,
            content_type: contentType,
            size: buffer.length,
            ...(filename && { name: filename })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
