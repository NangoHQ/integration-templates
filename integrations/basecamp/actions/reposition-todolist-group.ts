import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        projectId: z.string().describe('The ID of the Basecamp project (bucket) containing the to-do list group.'),
        groupId: z.string().describe('The ID of the to-do list group to reposition.'),
        position: z.number().int().min(1).describe('The new position of the to-do list group within its parent to-do list, starting at 1.')
    })
    .describe('Input to reposition a to-do list group within its parent to-do list.');

const OutputSchema = z.null().describe('No content returned on successful reposition.');

/**
 * @tags: [write]
 * @tagReason: Mutates the provider by updating the position of a to-do list group.
 */
const action = createAction({
    description: "Change a to-do list group's position within its parent to-do list.",
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://github.com/basecamp/bc3-api/blob/master/sections/todolist_groups.md
        await nango.put({
            endpoint: `/buckets/${encodeURIComponent(input.projectId)}/todolists/groups/${encodeURIComponent(input.groupId)}/position.json`,
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
