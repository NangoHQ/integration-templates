import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    list_id: z.string().describe('The ID of the list containing the entry to delete. Example: "39723680-f534-4fe7-ab80-c5278e20e37b"'),
    entry_id: z.string().describe('The ID of the list entry to delete. Example: "e9a7b33a-6dfc-483d-9a3b-fbc20068c162"')
});

const OutputSchema = z.object({
    success: z.boolean(),
    deleted_entry_id: z.string(),
    list_id: z.string()
});

const action = createAction({
    description: 'Delete or archive a list entry in Attio',
    version: '2.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/delete-list-entry',
        group: 'List Entries'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['list_entry:read-write', 'list_configuration:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://docs.attio.com/rest-api/reference/delete-v2-lists-list-entries-entry-id
        await nango.delete({
            endpoint: `/v2/lists/${input.list_id}/entries/${input.entry_id}`,
            retries: 3
        });

        return {
            success: true,
            deleted_entry_id: input.entry_id,
            list_id: input.list_id
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
