import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    file_id: z.string().describe('The unique identifier for the file to delete. Example: "123456789"'),
    force_delete: z.boolean().optional().describe('If true, permanently deletes the file bypassing the trash. If false or omitted, the file is moved to trash.')
});

const OutputSchema = z.object({
    success: z.boolean(),
    file_id: z.string(),
    permanently_deleted: z.boolean(),
    message: z.string()
});

const action = createAction({
    description: 'Delete or archive a file in Box',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/delete-file',
        group: 'Files'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['root_readwrite'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const file_id = input['file_id'];
        const force_delete = input['force_delete'];

        const queryParams: Record<string, string> = {};
        if (force_delete) {
            queryParams['force_delete'] = 'true';
        }

        const hasParams = Object.keys(queryParams).length > 0;

        // https://developer.box.com/reference/delete-files-id/
        await nango.delete({
            endpoint: `/2.0/files/${file_id}`,
            ...(hasParams && { params: queryParams }),
            retries: 10
        });

        return {
            success: true,
            file_id,
            permanently_deleted: force_delete || false,
            message: force_delete ? 'File has been permanently deleted' : 'File has been moved to trash'
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
