import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    name: z.string().describe('The name of the new folder. Example: "My New Folder"'),
    parent_id: z
        .string()
        .optional()
        .describe(
            'The ID of the parent folder where the new folder will be created. If omitted, the folder is created in the root of the drive. Example: "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms"'
        )
});

const OutputSchema = z.object({
    id: z.string().describe('The unique identifier of the created folder.'),
    name: z.string().describe('The name of the created folder.'),
    mime_type: z.string().describe('The MIME type of the folder (always application/vnd.google-apps.folder).'),
    created_at: z.string().describe('The timestamp when the folder was created.'),
    parent_ids: z.array(z.string()).describe('Array of parent folder IDs.')
});

const action = createAction({
    description: 'Create a new folder in Google Drive',
    version: '1.0.0',

    endpoint: {
        method: 'POST',
        path: '/actions/create-folder',
        group: 'Drive'
    },

    input: InputSchema,
    output: OutputSchema,
    scopes: ['https://www.googleapis.com/auth/drive.file'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developers.google.com/workspace/drive/api/reference/rest/v3/files/create
        const requestBody: Record<string, unknown> = {
            name: input.name,
            mimeType: 'application/vnd.google-apps.folder'
        };

        if (input.parent_id) {
            requestBody['parents'] = [input.parent_id];
        }

        const response = await nango.post({
            endpoint: '/drive/v3/files',
            params: {
                fields: 'id,name,mimeType,createdTime,parents'
            },
            data: requestBody,
            retries: 10
        });

        const file = response.data as {
            id: string;
            name: string;
            mimeType: string;
            createdTime: string;
            parents?: string[];
        };

        return {
            id: file.id,
            name: file.name,
            mime_type: file.mimeType,
            created_at: file.createdTime,
            parent_ids: file.parents || []
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
