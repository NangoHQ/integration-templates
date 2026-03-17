import { createAction } from 'nango';
import { z } from 'zod';

const InputSchema = z.object({});

const OutputSchema = z.object({
    success: z.boolean()
});

const action = createAction({
    description: 'Permanently delete all trashed files',
    version: '1.0.0',

    endpoint: {
        method: 'POST',
        path: '/actions/empty-trash',
        group: 'Files'
    },

    input: InputSchema,
    output: OutputSchema,
    scopes: ['https://www.googleapis.com/auth/drive'],

    exec: async (nango, _input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developers.google.com/workspace/drive/api/reference/rest/v3/files/emptyTrash
        await nango.delete({
            endpoint: '/drive/v3/files/trash',
            retries: 3
        });

        return {
            success: true
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
