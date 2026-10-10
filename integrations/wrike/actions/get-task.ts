import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        taskId: z.string().describe('The unique identifier of the Wrike task to retrieve. Example: "MAAAAAEQ_HoO".')
    })
    .describe('Input for retrieving a single Wrike task by ID.');

const CustomFieldSchema = z.object({
    id: z.string().describe('Identifier of the custom field definition.'),
    value: z.string().describe('Value stored for this task in that custom field, serialized as a string.')
});

const TaskDatesSchema = z.object({
    type: z
        .enum(['Backlog', 'Planned', 'Milestone'])
        .describe('Date type: "Backlog" when no dates are set, "Planned" when start/due are set, or "Milestone" for a due-date-only task.'),
    start: z.string().optional().describe('Start date in local ISO format, e.g. "2026-09-25T09:00:00". Present only for Planned tasks.'),
    due: z.string().optional().describe('Due date in local ISO format, e.g. "2026-10-01T17:00:00". Present for Planned and Milestone tasks.'),
    duration: z.number().optional().describe('Duration in minutes (1 Wrike day = 480 minutes). Present for Planned tasks.'),
    workOnWeekends: z.boolean().optional().describe('Whether weekends are included when scheduling the task.')
});

const TaskMetadataSchema = z.object({
    key: z.string().describe('Metadata entry key.'),
    value: z.string().describe('Metadata entry value.')
});

const OutputSchema = z
    .object({
        id: z.string().describe('Unique task identifier.'),
        accountId: z.string().describe('Identifier of the Wrike account the task belongs to.'),
        title: z.string().describe('Task title.'),
        description: z.string().optional().describe('Task description as HTML. Empty string when no description is set.'),
        briefDescription: z.string().optional().describe('Plain-text summary of the task description.'),
        parentIds: z.array(z.string()).optional().describe('IDs of the folders/projects directly containing the task.'),
        superParentIds: z.array(z.string()).optional().describe('Folder IDs inherited from a parent task.'),
        sharedIds: z.array(z.string()).optional().describe('IDs of users the task is shared with.'),
        responsibleIds: z.array(z.string()).optional().describe('IDs of users assigned to the task.'),
        status: z.enum(['Active', 'Deferred', 'Completed', 'Cancelled']).describe('Task status.'),
        importance: z.enum(['High', 'Low', 'Normal']).describe('Task importance.'),
        createdDate: z.string().describe('Creation timestamp in UTC, e.g. "2026-10-07T01:48:56Z".'),
        updatedDate: z.string().describe('Last modification timestamp in UTC.'),
        completedDate: z.string().optional().describe('Completion timestamp in UTC. Present only for completed tasks.'),
        dates: TaskDatesSchema.describe('Scheduling dates and their type.'),
        scope: z
            .enum(['WsTask', 'RbTask', 'WsFolder', 'RbFolder', 'WsRoot', 'RbRoot'])
            .describe('Storage scope of the task: "WsTask" for an active task, "RbTask" for a task in the Recycle Bin.'),
        authorIds: z.array(z.string()).optional().describe('IDs of the users who authored the task.'),
        customStatusId: z.string().optional().describe('ID of the custom workflow status assigned to the task.'),
        hasAttachments: z.boolean().optional().describe('Whether the task has any attachments.'),
        permalink: z.string().optional().describe('URL that opens the task in the Wrike web workspace.'),
        priority: z.string().optional().describe('Ordering key that defines the task position within its list.'),
        followedByMe: z.boolean().optional().describe('Whether the current user follows the task.'),
        followerIds: z.array(z.string()).optional().describe('IDs of users following the task.'),
        superTaskIds: z.array(z.string()).optional().describe('IDs of parent tasks (the task is a subtask of these).'),
        subTaskIds: z.array(z.string()).optional().describe('IDs of this task\u2019s subtasks.'),
        dependencyIds: z.array(z.string()).optional().describe('IDs of dependencies linked to the task.'),
        metadata: z.array(TaskMetadataSchema).optional().describe('Custom metadata entries attached to the task.'),
        customFields: z.array(CustomFieldSchema).optional().describe('Custom field values set on the task. Empty unless a value has actually been persisted.')
    })
    .describe('A Wrike task including its status, dates, assignees, hierarchy IDs and custom field values.');

const ProviderResponseSchema = z.object({
    kind: z.string(),
    data: z.array(OutputSchema)
});

/**
 * @tags: [read]
 * @tagReason: Reads a single task from the provider and makes no changes to any provider resource.
 * @pitfalls: Soft-deleted tasks in the Recycle Bin are still returned by ID (they come back with scope "RbTask") instead of erroring, and customFields only lists values that were actually persisted, so a Space-scoped field set on a task outside its space silently no-ops and is absent.
 */
const action = createAction({
    description: 'Retrieve a single Wrike task by ID, including its status, dates, assignees, hierarchy IDs and custom field values.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://developers.wrike.com/reference/gettasksmulti
            endpoint: `/tasks/${encodeURIComponent(input.taskId)}`,
            retries: 3
        });

        const parsed = ProviderResponseSchema.parse(response.data);
        const task = parsed.data[0];

        if (!task) {
            throw new nango.ActionError({
                type: 'not_found',
                message: `No task found for ID "${input.taskId}".`,
                taskId: input.taskId
            });
        }

        return task;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
