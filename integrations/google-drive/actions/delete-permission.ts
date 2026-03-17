import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    fileId: z.string().describe('The ID of the file to delete the permission from. Example: "1xJTXyJ1Pm1rK3Y9J1Y9J1Y9J1Y9J1Y9J"'),
    permissionId: z.string().describe('The ID of the permission to delete. Example: "12345678901234567890"')
});

const OutputSchema = z.object({
    success: z.boolean(),
    fileId: z.string(),
    permissionId: z.string()
});

const action = createAction({
    description: 'Remove a permission from a file',
    version: '1.0.0',

    endpoint: {
        method: 'POST',
        path: '/actions/delete-permission',
        group: 'Permissions'
    },

    input: InputSchema,
    output: OutputSchema,
    scopes: ['https://www.googleapis.com/auth/drive.file', 'https://www.googleapis.com/auth/drive'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developers.google.com/workspace/drive/api/reference/rest/v3/permissions/delete
        await nango.delete({
            endpoint: `drive/v3/files/${input.fileId}/permissions/${input.permissionId}`,
            retries: 3
        });

        return {
            success: true,
            fileId: input.fileId,
            permissionId: input.permissionId
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
