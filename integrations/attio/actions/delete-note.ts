import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    note_id: z.string().uuid().describe('The ID of the note to delete. Example: "d1b66c4d-13f5-4489-8ce5-b4afd63dce36"')
});

const OutputSchema = z.object({
    note_id: z.string(),
    deleted: z.boolean()
});

const action = createAction({
    description: 'Delete or archive a note in Attio.',
    version: '2.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['note:read-write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://docs.attio.com/rest-api/endpoint-reference/notes/delete-a-note
        await nango.delete({
            endpoint: `/v2/notes/${input.note_id}`,
            retries: 3
        });

        return {
            note_id: input.note_id,
            deleted: true
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
