import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    noteId: z.number().describe('Note ID to delete. Example: 889038936')
});

const OutputSchema = z.object({
    id: z.number(),
    success: z.boolean()
});

const action = createAction({
    description: 'Delete a note.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['read_deals', 'read_people', 'read_companies', 'read_admin', 'write_deals', 'write_people', 'write_companies', 'write_admin'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.delete({
            // https://app.pipelinecrm.com/api/docs
            endpoint: `/api/v3/notes/${encodeURIComponent(input.noteId)}.json`,
            retries: 1
        });

        if (response.status === 404) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Note not found',
                noteId: input.noteId
            });
        }

        return {
            id: input.noteId,
            success: response.status === 204
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
