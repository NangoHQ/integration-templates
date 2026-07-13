import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    linked_file_id: z.number().int().describe('The ID of the linked file to delete. Example: 46')
});

const OutputSchema = z.object({
    linked_file_id: z.number(),
    success: z.boolean()
});

const action = createAction({
    description: 'Delete a linked file.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        await nango.delete({
            // https://developer.shortcut.com/api/rest/v3#Delete-Linked-File
            endpoint: `/api/v3/linked-files/${encodeURIComponent(String(input.linked_file_id))}`,
            retries: 3
        });

        return {
            linked_file_id: input.linked_file_id,
            success: true
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
