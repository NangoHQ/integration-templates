import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    itemId: z.string().describe('The ID of the drive item to delete. Example: "0123456789abc"')
});

const OutputSchema = z.object({
    success: z.boolean().describe('Whether the item was successfully deleted'),
    itemId: z.string().describe('The ID of the deleted item')
});

const action = createAction({
    description: 'Delete a file or folder from OneDrive',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['onedrive.readwrite'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://learn.microsoft.com/onedrive/developer/rest-api/api/driveitem_delete
        await nango.delete({
            endpoint: `/v1.0/drive/items/${encodeURIComponent(input.itemId)}`,
            retries: 3
        });

        return {
            success: true,
            itemId: input.itemId
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
