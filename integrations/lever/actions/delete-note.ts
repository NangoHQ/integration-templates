import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    opportunityId: z.string().describe('The ID of the opportunity to delete the note from. Example: "6408dc54-7015-4e5b-8d60-23afff2b1efc"'),
    noteId: z.string().describe('The ID of the note to delete. Example: "2c506ee0-f99f-4aff-b556-76e003efb5ea"')
});

const OutputSchema = z.object({
    success: z.boolean(),
    opportunityId: z.string(),
    noteId: z.string()
});

const action = createAction({
    description: 'Delete a note from an opportunity.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        await nango.delete({
            // https://hire.lever.co/developer/documentation
            endpoint: `/v1/opportunities/${encodeURIComponent(input.opportunityId)}/notes/${encodeURIComponent(input.noteId)}`,
            retries: 3
        });

        return {
            success: true,
            opportunityId: input.opportunityId,
            noteId: input.noteId
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
