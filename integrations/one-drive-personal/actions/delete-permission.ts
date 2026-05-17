import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    itemId: z.string().describe('The ID of the drive item. Example: "0123456789abc"'),
    permissionId: z.string().describe('The ID of the permission to delete. Example: "b123456789ab!123"')
});

const OutputSchema = z.object({
    success: z.boolean(),
    itemId: z.string(),
    permissionId: z.string()
});

const action = createAction({
    description: 'Remove a sharing permission from an item.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/delete-permission',
        group: 'Permissions'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['onedrive.readwrite'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://learn.microsoft.com/onedrive/developer/rest-api/api/permission_delete
        const config = {
            endpoint: `/v1.0/drive/items/${encodeURIComponent(input.itemId)}/permissions/${encodeURIComponent(input.permissionId)}`,
            retries: 3
        };

        await nango.delete(config);

        return {
            success: true,
            itemId: input.itemId,
            permissionId: input.permissionId
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
