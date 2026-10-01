import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    fileId: z
        .string()
        .describe(
            'The ID of the Google Workspace file to export (Doc, Sheet, Slide, etc.). Example: "1Kj3d86Z-Sfd56YP4dImQ-ggMRyP2QZ_BRO33zOO224c"'
        ),
    mimeType: z
        .enum([
            'application/pdf',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'application/vnd.openxmlformats-officedocument.presentationml.presentation',
            'text/html',
            'text/plain',
            'text/csv',
            'application/rtf',
            'application/epub+zip'
        ])
        .describe('The target MIME type for the export.')
});

const OutputSchema = z.object({
    fileId: z.string(),
    mimeType: z.string(),
    data: z.string().describe('The exported file encoded as a base64 string.'),
    size: z.number().describe('The size of the exported data in bytes.')
});

const action = createAction({
    description: 'Export a Google Workspace file (Doc, Sheet, Slide, etc.) to the specified MIME type.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['drive.readonly', 'drive'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developers.google.com/workspace/drive/api/reference/rest/v3/files/export
        const response = await nango.get({
            endpoint: `/drive/v3/files/${encodeURIComponent(input.fileId)}/export`,
            params: {
                mimeType: input.mimeType
            },
            responseType: 'arraybuffer',
            retries: 3
        });

        const rawData = response.data;
        if (typeof rawData !== 'object' || rawData === null) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Expected binary response from export API.'
            });
        }

        const buffer = Buffer.isBuffer(rawData) ? rawData : Buffer.from(rawData);

        return {
            fileId: input.fileId,
            mimeType: input.mimeType,
            data: buffer.toString('base64'),
            size: buffer.length
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
