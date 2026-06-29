import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    folderId: z.string().describe('Folder ID. Example: "FAHNA0uMKHU"')
});

const OutputSchema = z.object({
    success: z.boolean()
});

const action = createAction({
    description: 'Delete a folder.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['folder:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.delete({
            // https://www.canva.dev/docs/connect/api-reference/folders/
            endpoint: `/rest/v1/folders/${encodeURIComponent(input.folderId)}`,
            retries: 1
        });

        if (response.status !== 204 && response.status !== 200) {
            throw new nango.ActionError({
                type: 'delete_failed',
                message: `Failed to delete folder. Status: ${response.status}`,
                folderId: input.folderId
            });
        }

        return { success: true };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
