import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    fileId: z.string().describe('The ID of the file or folder to delete. Example: "1aBcDeFgHiJkLmNoPqRsTuVwXyZ123456"')
});

const OutputSchema = z.object({
    success: z.boolean().describe('Whether the file was successfully deleted'),
    fileId: z.string().describe('The ID of the deleted file')
});

const action = createAction({
    description: 'Delete a file or folder from Google Drive',
    version: '1.0.0',

    endpoint: {
        method: 'POST',
        path: '/actions/delete-file',
        group: 'Files'
    },

    input: InputSchema,
    output: OutputSchema,
    scopes: ['https://www.googleapis.com/auth/drive.file'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developers.google.com/workspace/drive/api/reference/rest/v3/files/delete
        await nango.delete({
            endpoint: `/drive/v3/files/${input.fileId}`,
            retries: 3
        });

        return {
            success: true,
            fileId: input.fileId
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
