import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    folderId: z.string().describe('The ID of the folder to delete. Example: "382204778319"'),
    recursive: z
        .boolean()
        .optional()
        .describe('Whether to delete the folder and all its contents. If false and folder is not empty, the operation will fail. Defaults to true.')
});

const OutputSchema = z.object({
    success: z.boolean().describe('Whether the folder deletion succeeded'),
    folderId: z.string().describe('The ID of the deleted folder')
});

const action = createAction({
    description: 'Delete or archive a folder in Box',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['root_readwrite'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const recursive = input.recursive ?? true;

        // https://developer.box.com/reference/delete-folders-id/
        await nango.delete({
            endpoint: `/2.0/folders/${input.folderId}`,
            params: {
                recursive: recursive.toString()
            },
            retries: 3
        });

        return {
            success: true,
            folderId: input.folderId
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
