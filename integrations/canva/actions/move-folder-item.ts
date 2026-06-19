import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    item_id: z.string().describe('The ID of the item to move. Example: "DAHNACmCy_g"'),
    to_folder_id: z.string().describe('The ID of the destination folder. Example: "FAHNA0uMKHU"')
});

const OutputSchema = z.object({
    success: z.boolean()
});

const action = createAction({
    description: 'Move a folder item to another folder.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['folder:write'],
    endpoint: {
        path: '/actions/move-folder-item',
        method: 'POST'
    },

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://www.canva.dev/docs/connect/api-reference/folders/move-folder-item/
        await nango.post({
            endpoint: '/rest/v1/folders/move',
            data: {
                item_id: input.item_id,
                to_folder_id: input.to_folder_id
            },
            retries: 1
        });

        return {
            success: true
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
