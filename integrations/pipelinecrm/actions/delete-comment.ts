import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    noteId: z.number().int().describe('Note ID. Example: 889038936'),
    commentId: z.number().int().describe('Comment ID. Example: 12195967')
});

const OutputSchema = z.object({
    success: z.boolean()
});

const action = createAction({
    description: 'Delete a comment.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        await nango.delete({
            // https://app.pipelinecrm.com/openapi.yaml
            endpoint: `/api/v3/notes/${encodeURIComponent(input.noteId)}/comments/${encodeURIComponent(input.commentId)}`,
            retries: 3
        });

        return { success: true };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
