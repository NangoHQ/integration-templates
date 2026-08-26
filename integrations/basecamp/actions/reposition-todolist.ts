import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        projectId: z.number().describe('The ID of the project containing the to-do list.'),
        todoListId: z.number().describe('The ID of the to-do list to reposition.'),
        position: z
            .number()
            .min(1)
            .describe('The new position within the to-do set, counting only incomplete lists. A value of 1 places the list above all other incomplete lists.')
    })
    .describe('Input for repositioning a to-do list within its to-do set.');

/**
 * @tags: [write]
 * @tagReason: Mutates the position of a to-do list within its to-do set.
 */
const action = createAction({
    description: "Change a to-do list's position within its to-do set.",
    version: '1.0.0',
    input: InputSchema,
    output: z.null().describe('Empty response indicating the to-do list was successfully repositioned.'),
    scopes: ['write'],

    exec: async (nango, input): Promise<null> => {
        // https://raw.githubusercontent.com/basecamp/bc3-api/master/sections/todolists.md
        await nango.put({
            endpoint: `/buckets/${encodeURIComponent(input.projectId)}/todosets/todolists/${encodeURIComponent(input.todoListId)}/position.json`,
            data: {
                position: input.position
            },
            retries: 3
        });

        return null;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
