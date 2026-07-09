import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    board_id: z.string().describe('Board ID. Example: "1099300658984851679"')
});

const OutputSchema = z.object({
    board_id: z.string(),
    success: z.boolean()
});

const action = createAction({
    description: 'Delete a board.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['boards:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        await nango.delete({
            // https://developers.pinterest.com/docs/api/v5/
            endpoint: `/v5/boards/${encodeURIComponent(input.board_id)}`,
            retries: 3
        });

        return {
            board_id: input.board_id,
            success: true
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
