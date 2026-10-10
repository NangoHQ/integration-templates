import { z } from 'zod';
import { createAction } from 'nango';

const TaskDatesInputSchema = z.object({
    start: z.string().optional().describe('Start date/time. Format: yyyy-MM-dd or yyyy-MM-ddTHH:mm:ss. Include a due date or duration when setting it.'),
    due: z.string().optional().describe('Due date/time. Format: yyyy-MM-dd or yyyy-MM-ddTHH:mm:ss. Setting it alone turns the task into a milestone.'),
    duration: z.number().optional().describe('Duration in minutes (1 day = 480 minutes). Resend start and due when changing it, or they are cleared.'),
    workOnWeekends: z.boolean().optional().describe('Whether weekends count toward the schedule.'),
    type: z.enum(['Milestone', 'Backlog', 'Planned']).optional().describe('Schedule type: Milestone, Backlog, or Planned.')
});

const InputSchema = z
    .object({
        taskId: z.string().describe('ID of the task to update. Example: "MAAAAAEQ_HoO".'),
        title: z.string().optional().describe('New task title.'),
        description: z.string().optional().describe('New task description. Wrike accepts HTML.'),
        status: z
            .enum(['Active', 'Deferred', 'Completed', 'Cancelled'])
            .optional()
            .describe('Status group to set. Use customStatusId to pick a specific custom status.'),
        customStatusId: z.string().optional().describe('ID of a custom workflow status to assign. Get IDs from the workflows endpoint.'),
        importance: z.enum(['High', 'Normal', 'Low']).optional().describe('Task importance.'),
        dates: TaskDatesInputSchema.optional().describe('Task scheduling fields to change. Sent as a partial JSON object.'),
        addResponsibles: z.array(z.string()).optional().describe('User IDs to add to the assignee list. Appends; it does not replace existing assignees.'),
        removeResponsibles: z.array(z.string()).optional().describe('User IDs to remove from the assignee list.')
    })
    .describe('Task fields to update. Only the provided fields are changed; omitted fields are left as-is.');

const ProviderTaskDatesSchema = z.object({
    type: z.string().nullable().optional(),
    start: z.string().nullable().optional(),
    due: z.string().nullable().optional(),
    duration: z.number().nullable().optional(),
    workOnWeekends: z.boolean().nullable().optional()
});

const ProviderTaskSchema = z.object({
    id: z.string(),
    title: z.string().nullable().optional(),
    description: z.string().nullable().optional(),
    status: z.string().nullable().optional(),
    importance: z.string().nullable().optional(),
    dates: ProviderTaskDatesSchema.nullable().optional(),
    responsibleIds: z.array(z.string()).nullable().optional(),
    customStatusId: z.string().nullable().optional(),
    completedDate: z.string().nullable().optional(),
    updatedDate: z.string().nullable().optional(),
    permalink: z.string().nullable().optional(),
    parentIds: z.array(z.string()).nullable().optional()
});

const ProviderResponseSchema = z.object({
    kind: z.string().optional(),
    data: z.array(ProviderTaskSchema)
});

const TaskDatesOutputSchema = z.object({
    type: z.string().optional().describe('Schedule type: Milestone, Backlog, or Planned.'),
    start: z.string().optional().describe('Start date/time.'),
    due: z.string().optional().describe('Due date/time.'),
    duration: z.number().optional().describe('Duration in minutes (1 day = 480 minutes).'),
    workOnWeekends: z.boolean().optional().describe('Whether weekends count toward the schedule.')
});

const OutputSchema = z
    .object({
        id: z.string().describe('Unique task ID.'),
        title: z.string().optional().describe('Task title.'),
        description: z.string().optional().describe('Task description (HTML).'),
        status: z.string().optional().describe('Status group: Active, Deferred, Completed, or Cancelled.'),
        importance: z.string().optional().describe('Task importance: High, Normal, or Low.'),
        dates: TaskDatesOutputSchema.optional().describe('Task scheduling information.'),
        responsibleIds: z.array(z.string()).optional().describe('IDs of the users assigned to the task.'),
        customStatusId: z.string().optional().describe("ID of the task's custom workflow status."),
        completedDate: z.string().optional().describe('Completion timestamp in UTC, present when the task is completed.'),
        updatedDate: z.string().optional().describe('Last update timestamp in UTC.'),
        permalink: z.string().optional().describe('URL to open the task in the Wrike workspace.'),
        parentIds: z.array(z.string()).optional().describe('IDs of the folders or projects containing the task.')
    })
    .describe('The updated task as returned by the provider.');

/**
 * @tags: [write]
 * @tagReason: Updates an existing task's fields on the provider; it does not read provider data first.
 * @pitfalls: status accepts only the group values Active/Deferred/Completed/Cancelled (custom status names like "In Progress" are rejected; use customStatusId) and is unavailable on the Team plan; setting dates.due alone converts the task to a milestone and changing dates.duration without resending start and due clears them; assignees are appended or removed only, never replaced wholesale.
 */
const action = createAction({
    description: "Update a task's fields (status, dates, title, description, assignees, importance) with a partial merge.",
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const params: Record<string, string> = {
            ...(input.title !== undefined && { title: input.title }),
            ...(input.description !== undefined && { description: input.description }),
            ...(input.status !== undefined && { status: input.status }),
            ...(input.customStatusId !== undefined && { customStatus: input.customStatusId }),
            ...(input.importance !== undefined && { importance: input.importance }),
            ...(input.dates !== undefined && { dates: JSON.stringify(input.dates) }),
            ...(input.addResponsibles !== undefined && { addResponsibles: JSON.stringify(input.addResponsibles) }),
            ...(input.removeResponsibles !== undefined && { removeResponsibles: JSON.stringify(input.removeResponsibles) })
        };

        const response = await nango.put<unknown>({
            // https://developers.wrike.com/reference/puttaskssingle
            endpoint: `/tasks/${encodeURIComponent(input.taskId)}`,
            params,
            retries: 3
        });

        const parsed = ProviderResponseSchema.parse(response.data);
        const task = parsed.data[0];

        if (!task) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'The task was not returned by the provider.',
                taskId: input.taskId
            });
        }

        return {
            id: task.id,
            ...(task.title != null && { title: task.title }),
            ...(task.description != null && { description: task.description }),
            ...(task.status != null && { status: task.status }),
            ...(task.importance != null && { importance: task.importance }),
            ...(task.dates != null && {
                dates: {
                    ...(task.dates.type != null && { type: task.dates.type }),
                    ...(task.dates.start != null && { start: task.dates.start }),
                    ...(task.dates.due != null && { due: task.dates.due }),
                    ...(task.dates.duration != null && { duration: task.dates.duration }),
                    ...(task.dates.workOnWeekends != null && { workOnWeekends: task.dates.workOnWeekends })
                }
            }),
            ...(task.responsibleIds != null && { responsibleIds: task.responsibleIds }),
            ...(task.customStatusId != null && { customStatusId: task.customStatusId }),
            ...(task.completedDate != null && { completedDate: task.completedDate }),
            ...(task.updatedDate != null && { updatedDate: task.updatedDate }),
            ...(task.permalink != null && { permalink: task.permalink }),
            ...(task.parentIds != null && { parentIds: task.parentIds })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
