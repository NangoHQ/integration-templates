import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        projectId: z
            .string()
            .optional()
            .describe(
                'ID of the project containing the tasks. When omitted or empty, the tasks are completed in the current user\'s inbox. Example: "6ac94f2f8f084dbfaa69e17d"'
            ),
        taskIds: z.array(z.string()).min(1).max(50).describe('IDs of the tasks to complete in one call. The provider only processes the first 50 IDs.')
    })
    .describe('Input for completing up to 50 tasks in a single project in one call.');

const CompletedTaskIdsSchema = z.array(z.string());

const OutputSchema = z
    .object({
        completedTaskIds: z.array(z.string()).describe('IDs of the tasks that the provider reported as successfully completed.'),
        completedCount: z.number().int().describe('Number of tasks reported as successfully completed.')
    })
    .describe('Result of the batch task completion, listing the task IDs the provider completed.');

/**
 * @tags: [write]
 * @tagReason: Marks the supplied tasks as completed in the provider, changing their status to done.
 * @pitfalls: When projectId is omitted the tasks are completed in the current user's inbox rather than a specific project, and task IDs that are not in the given project (or do not exist) are silently skipped instead of erroring, so compare the returned IDs against the requested ones to detect anything that was not completed.
 */
const action = createAction({
    description: 'Complete up to 50 tasks in a single project in one call.',
    version: '1.0.0',
    scopes: ['tasks:write'],
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developer.ticktick.com/docs/openapi.md (Complete Multiple Tasks)
        const response = await nango.post({
            endpoint: '/open/v1/task/completeTasks',
            data: {
                ...(input.projectId != null && input.projectId !== '' && { projectId: input.projectId }),
                taskIds: input.taskIds
            },
            // Completing an already-completed task is a no-op, so retrying a lost response is safe.
            retries: 3
        });

        const completedTaskIds = CompletedTaskIdsSchema.parse(response.data);

        return {
            completedTaskIds,
            completedCount: completedTaskIds.length
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
