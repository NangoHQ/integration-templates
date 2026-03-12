import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    file_id: z.string().describe('The ID of the file to copy. Example: "123abc"'),
    name: z.string().optional().describe('The new name for the copied file. If not provided, the original name is used.'),
    destination_folder_id: z
        .string()
        .optional()
        .describe('The ID of the folder where the copy should be placed. If not provided, the copy is placed in the same folder as the original.')
});

const OutputSchema = z.object({
    id: z.string().describe('The ID of the copied file'),
    name: z.string().describe('The name of the copied file'),
    mime_type: z.string().describe('The MIME type of the copied file'),
    created_at: z.union([z.string(), z.null()]).describe('The creation time of the copied file (RFC 3339)')
});

const action = createAction({
    description: 'Copy a file to a destination',
    version: '1.0.0',

    endpoint: {
        method: 'POST',
        path: '/actions/copy-file',
        group: 'Files'
    },

    input: InputSchema,
    output: OutputSchema,
    scopes: ['https://www.googleapis.com/auth/drive.file'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const requestBody: { name?: string; parents?: string[] } = {};

        if (input.name) {
            requestBody.name = input.name;
        }

        if (input.destination_folder_id) {
            requestBody.parents = [input.destination_folder_id];
        }

        // https://developers.google.com/drive/api/reference/rest/v3/files/copy
        const response = await nango.post({
            endpoint: `/drive/v3/files/${input.file_id}/copy`,
            data: requestBody,
            retries: 10
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'copy_failed',
                message: 'Failed to copy file',
                file_id: input.file_id
            });
        }

        return {
            id: response.data.id,
            name: response.data.name,
            mime_type: response.data.mimeType,
            created_at: response.data.createdTime ?? null
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
