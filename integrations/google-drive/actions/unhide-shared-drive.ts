import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    drive_id: z.string().describe('The ID of the shared drive to unhide. Example: "0ABC123xyz"')
});

const OutputSchema = z.object({
    id: z.string(),
    name: z.union([z.string(), z.null()]),
    hidden: z.union([z.boolean(), z.null()]),
    created_time: z.union([z.string(), z.null()]),
    kind: z.union([z.string(), z.null()])
});

const action = createAction({
    description: 'Restore a hidden shared drive to default view',
    version: '1.0.0',

    endpoint: {
        method: 'POST',
        path: '/actions/unhide-shared-drive',
        group: 'Shared Drives'
    },

    input: InputSchema,
    output: OutputSchema,
    scopes: ['https://www.googleapis.com/auth/drive'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developers.google.com/workspace/drive/api/reference/rest/v3/drives/unhide
        const response = await nango.post({
            endpoint: `/drive/v3/drives/${input.drive_id}/unhide`,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Shared drive not found or could not be unhidden',
                drive_id: input.drive_id
            });
        }

        return {
            id: response.data.id,
            name: response.data.name ?? null,
            hidden: response.data.hidden ?? null,
            created_time: response.data.createdTime ?? null,
            kind: response.data.kind ?? null
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
