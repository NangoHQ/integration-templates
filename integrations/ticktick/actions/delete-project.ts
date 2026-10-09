import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        projectId: z.string().describe('ID of the project to permanently delete. Example: "6226ff9877acee87727f6bca"')
    })
    .describe('Input for permanently deleting a TickTick project.');

const OutputSchema = z
    .object({
        id: z.string().describe('ID of the project that was deleted.'),
        deleted: z.boolean().describe('Whether the project was successfully deleted.')
    })
    .describe('Result of permanently deleting a TickTick project.');

/**
 * @tags: [write, destructive]
 * @tagReason: Permanently deletes a project through the provider's delete endpoint; the effect is irreversible.
 * @pitfalls: Deletion is irreversible and also removes all of the project's tasks and columns; subsequent lookups of those removed tasks can fail with an unexpected 500 instead of a 404.
 */
const action = createAction({
    description: 'Permanently delete a project.',
    version: '1.0.0',
    scopes: ['tasks:write'],
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        await nango.delete({
            // https://developer.ticktick.com/docs/openapi.md - Delete Project: DELETE /open/v1/project/{projectId}
            endpoint: `/open/v1/project/${encodeURIComponent(input.projectId)}`,
            // Verified live: re-deleting an already-deleted project returns 200, so retrying a lost response is safe.
            retries: 3
        });

        return {
            id: input.projectId,
            deleted: true
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
