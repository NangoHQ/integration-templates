/**
 * Instructions: Deletes a note.
 * API: https://docs.attio.com/rest-api/endpoint-reference/notes/delete-a-note
 */

import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

// Inline schema definitions
const DeleteNoteInput = z.object({
    note_id: z.string()
        .describe('The note ID to delete. Example: "abc123-def456"')
});

const DeleteNoteOutput = z.object({
    success: z.boolean().describe('Whether the deletion was successful')
});

const action = createAction({
    description: 'Deletes a note.',
    version: '1.0.0',

    endpoint: {
        method: 'DELETE',
        path: '/notes/:note_id',
        group: 'Notes'
    },

    input: DeleteNoteInput,
    output: DeleteNoteOutput,
    scopes: ['note:read-write'],

    exec: async (nango, input): Promise<z.infer<typeof DeleteNoteOutput>> => {
        const config: ProxyConfiguration = {
            // https://docs.attio.com/rest-api/endpoint-reference/notes/delete-a-note
            endpoint: `v2/notes/${input.note_id}`,
            retries: 3
        };

        await nango.delete(config);

        return {
            success: true
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
