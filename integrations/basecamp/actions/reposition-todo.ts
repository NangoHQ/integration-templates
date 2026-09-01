import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        projectId: z.number().describe('The project (bucket) ID that contains the to-do.'),
        todoId: z.number().describe('The ID of the to-do to reposition.'),
        position: z.number().min(1).describe('The new position within the list (1-based).'),
        parentId: z.number().optional().describe('Optional to-do list ID to move the to-do into a different list.')
    })
    .describe('Input to reposition a to-do within its list or move it to another list.');

/**
 * @tags: [write]
 * @tagReason: Mutates the position (and optionally parent list) of an existing to-do.
 * @pitfalls: A 404 may mean the record is missing, the caller lacks permission, or the account is inactive.
 */
const action = createAction({
    description: "Change a to-do's position within its list, optionally moving it to a different to-do list.",
    version: '1.0.0',
    input: InputSchema,
    output: z.null(),
    scopes: [],

    exec: async (nango, input): Promise<null> => {
        const body: { position: number; parent_id?: number } = {
            position: input.position
        };

        if (input.parentId !== undefined) {
            body.parent_id = input.parentId;
        }

        // https://github.com/basecamp/bc3-api/blob/master/sections/todos.md
        await nango.put({
            endpoint: `/buckets/${encodeURIComponent(input.projectId)}/todos/${encodeURIComponent(input.todoId)}/position.json`,
            data: body,
            retries: 10
        });

        return null;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
