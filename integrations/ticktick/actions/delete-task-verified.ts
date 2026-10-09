import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        projectId: z.string().describe('ID of the project that contains the task to delete. Example: "6226ff9877acee87727f6bca".'),
        taskId: z.string().describe('ID of the task to delete. Example: "63b7bebb91c0a5474805fcd4".')
    })
    .describe('Identifies the task to delete and the project that contains it.');

const OutputSchema = z
    .object({
        projectId: z.string().describe('ID of the project the task was deleted from.'),
        taskId: z.string().describe('ID of the task that was deleted and confirmed absent.'),
        deleted: z.boolean().describe('True once the task is confirmed absent from the project; the action throws instead of returning false.'),
        remainingTaskCount: z.number().describe('Number of open or completed tasks returned by the project after the deletion.')
    })
    .describe('Confirmation that the requested task was deleted from its project.');

const FilterResponseSchema = z.array(
    z.object({
        id: z.string(),
        projectId: z.string()
    })
);

/**
 * @tags: [read, write, destructive]
 * @tagReason: Permanently deletes the task (destructive write) and then reads the project's tasks to confirm it is gone.
 * @pitfalls: Deletion is permanent and cannot be undone, and deleting an already-deleted task still returns success; in a project with more than 200 open or completed tasks the verification may not be able to find a still-present task and can report success incorrectly.
 */
const action = createAction({
    description: 'Delete a task and confirm removal through the filter endpoint, which reflects deletions immediately (unlike the direct task GET).',
    version: '1.0.0',
    scopes: ['tasks:read', 'tasks:write'],
    input: InputSchema,
    output: OutputSchema,
    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developer.ticktick.com/docs/openapi.md (Delete Task)
        // TickTick deletes are idempotent (re-deleting an already-deleted task still returns 200), so retrying is safe.
        await nango.delete({
            endpoint: `/open/v1/project/${encodeURIComponent(input.projectId)}/task/${encodeURIComponent(input.taskId)}`,
            retries: 3
        });

        // https://developer.ticktick.com/docs/openapi.md (Filter Tasks)
        const filterResponse = await nango.post({
            endpoint: '/open/v1/task/filter',
            data: {
                projectIds: [input.projectId],
                status: [0, 2]
            },
            retries: 3
        });

        const tasks = FilterResponseSchema.parse(filterResponse.data ?? []);
        const stillPresent = tasks.some((task) => task.id === input.taskId);

        if (stillPresent) {
            throw new nango.ActionError({
                type: 'delete_not_verified',
                message: 'The task is still returned by the project task filter after the delete call.',
                projectId: input.projectId,
                taskId: input.taskId
            });
        }

        return {
            projectId: input.projectId,
            taskId: input.taskId,
            deleted: true,
            remainingTaskCount: tasks.length
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
