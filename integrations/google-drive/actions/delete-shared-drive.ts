import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    driveId: z.string().describe('The ID of the shared drive to delete. Example: "0AP4r1ZoX57FvUk9PVA"')
});

const OutputSchema = z.object({
    success: z.boolean(),
    driveId: z.string()
});

const action = createAction({
    description: 'Delete a shared drive',
    version: '1.0.0',

    endpoint: {
        method: 'POST',
        path: '/actions/delete-shared-drive',
        group: 'Drives'
    },

    input: InputSchema,
    output: OutputSchema,
    scopes: ['https://www.googleapis.com/auth/drive'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developers.google.com/drive/api/reference/rest/v3/drives/delete
        await nango.delete({
            endpoint: `/drive/v3/drives/${input.driveId}`,
            retries: 3
        });

        return {
            success: true,
            driveId: input.driveId
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
