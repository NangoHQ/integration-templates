import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    itemId: z.string().describe('The ID of the OneDrive item. Example: "01JRXCVV4F3FS3J3G7QJD2ZRK2O4I3XPGZ"'),
    permissionId: z.string().describe('The ID of the permission to delete. Example: "1"')
});

const OutputSchema = z.object({
    success: z.boolean().describe('Whether the permission was successfully deleted')
});

const action = createAction({
    description: 'Remove a sharing permission from an item',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/delete-permission'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['Files.ReadWrite', 'offline_access'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://learn.microsoft.com/graph/api/permission-delete
        await nango.delete({
            endpoint: `/v1.0/me/drive/items/${encodeURIComponent(input.itemId)}/permissions/${encodeURIComponent(input.permissionId)}`,
            retries: 3
        });

        return {
            success: true
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
