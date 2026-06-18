import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    itemId: z.string().describe('The ID of the item (file or folder) to delete. Example: "0123456789ABC"')
});

const OutputSchema = z.object({
    success: z.boolean().describe('Whether the deletion was successful'),
    itemId: z.string().describe('The ID of the deleted item'),
    message: z.string().describe('Status message')
});

const action = createAction({
    description: 'Delete a file or folder.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['Files.ReadWrite', 'offline_access'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://learn.microsoft.com/graph/api/driveitem-delete
        await nango.delete({
            endpoint: `/v1.0/me/drive/items/${encodeURIComponent(input.itemId)}`,
            retries: 3
        });

        return {
            success: true,
            itemId: input.itemId,
            message: 'Item deleted successfully'
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
