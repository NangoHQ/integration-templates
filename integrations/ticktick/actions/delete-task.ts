import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        projectId: z.string().describe('ID of the project that contains the task. Example: "6ac5b589bed7f77658a9a803"'),
        taskId: z.string().describe('ID of the task to permanently delete. Example: "6ac5b589bed7f77658a9a80a"')
    })
    .describe('Identifies the project and task to permanently delete.');

const OutputSchema = z
    .object({
        success: z.boolean().describe('True when the provider accepted the deletion request (HTTP 200 response).')
    })
    .describe('Result of the task deletion request.');

/**
 * @tags: [write, destructive]
 * @tagReason: Permanently deletes a task through the provider API; the deletion cannot be undone.
 * @pitfalls: The deletion is permanent, and a direct re-read of the same task can still return the full stale task as if it still exists; confirm deletion by listing the project's tasks instead.
 */
const action = createAction({
    description: 'Permanently delete a task from a project.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['tasks:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developer.ticktick.com/docs/openapi.md - Delete Task
        await nango.delete({
            endpoint: `/open/v1/project/${encodeURIComponent(input.projectId)}/task/${encodeURIComponent(input.taskId)}`,
            // A retry after a lost response would repeat a destructive delete against an already-removed task.
            retries: 10
        });

        return { success: true };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
