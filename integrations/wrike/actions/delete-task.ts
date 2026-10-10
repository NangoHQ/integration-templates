import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        taskId: z.string().describe('ID of the task to delete. Example: "MAAAAAEQ_HoO".')
    })
    .describe('Input for soft-deleting a task.');

const ProviderTaskSchema = z.object({
    id: z.string(),
    title: z.string().optional(),
    scope: z.string().optional(),
    status: z.string().optional(),
    permalink: z.string().optional(),
    parentIds: z.array(z.string()).optional()
});

const ProviderResponseSchema = z.object({
    data: z.array(ProviderTaskSchema)
});

const OutputSchema = z
    .object({
        id: z.string().describe('ID of the deleted task.'),
        title: z.string().optional().describe('Title the task had at the time of deletion.'),
        scope: z.string().optional().describe('Tree scope of the task after deletion; "RbTask" means it is now in the Recycle Bin.'),
        status: z.string().optional().describe('Status the task had at the time of deletion.'),
        permalink: z.string().optional().describe('Web permalink of the deleted task.'),
        parentIds: z.array(z.string()).optional().describe('IDs of the task parent folders after deletion; a trashed task reports the Recycle Bin folder here.')
    })
    .describe('The task that was soft-deleted and moved to the Recycle Bin.');

/**
 * @tags: [write, destructive]
 * @tagReason: Moves the task to the Recycle Bin, mutating provider state in a way that is difficult to reverse.
 * @pitfalls: Soft delete only: the task moves to the Recycle Bin (scope "RbTask") and remains readable by ID; it does not cascade to its subtasks, which stay active but orphaned, and re-deleting an already-trashed task returns an error.
 */
const action = createAction({
    description: 'Move a task to the Recycle Bin (soft delete). Does not cascade to its subtasks.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.delete({
            // https://developers.wrike.com/api/v4/tasks/#delete-tasks
            endpoint: `/tasks/${encodeURIComponent(input.taskId)}`,
            // Not replayable: a retry after a lost response gets a 400 for the already-trashed task, masking a successful delete.
            // eslint-disable-next-line @nangohq/custom-integrations-linting/proxy-call-retries
            retries: 0
        });

        const parsed = ProviderResponseSchema.parse(response.data);
        const task = parsed.data[0];

        if (!task) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'The provider did not return the task after deletion.',
                taskId: input.taskId
            });
        }

        return {
            id: task.id,
            ...(task.title != null && { title: task.title }),
            ...(task.scope != null && { scope: task.scope }),
            ...(task.status != null && { status: task.status }),
            ...(task.permalink != null && { permalink: task.permalink }),
            ...(task.parentIds != null && { parentIds: task.parentIds })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
