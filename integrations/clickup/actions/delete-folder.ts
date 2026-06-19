import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    folder_id: z.string().describe('The ID of the folder to delete. Example: "901516078072"')
});

const OutputSchema = z.object({
    success: z.boolean().describe('Whether the deletion was successful')
});

const action = createAction({
    description: 'Delete a folder in ClickUp',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developer.clickup.com/reference/deletefolder
        await nango.delete({
            endpoint: `/api/v2/folder/${encodeURIComponent(input.folder_id)}`,
            retries: 3
        });

        return {
            success: true
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
