import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    driveId: z.string().describe('The ID of the shared drive to unhide. Example: "0ABC123xyz"')
});

const OutputSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    hidden: z.boolean().optional(),
    createdTime: z.string().optional(),
    kind: z.string().optional()
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
            endpoint: `/drive/v3/drives/${input.driveId}/unhide`,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Shared drive not found or could not be unhidden',
                driveId: input.driveId
            });
        }

        return {
            id: response.data.id,
            name: response.data.name ?? undefined,
            hidden: response.data.hidden ?? undefined,
            createdTime: response.data.createdTime ?? undefined,
            kind: response.data.kind ?? undefined
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
