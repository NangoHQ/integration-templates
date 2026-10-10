import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        folderId: z.string().describe('ID of the folder or project that will contain the new task. Example: "MQAAAAEQ_HoI".'),
        title: z.string().min(1).describe('Title of the task. Must not be empty.'),
        description: z.string().optional().describe('Description of the task. Left blank when omitted.'),
        responsibles: z.array(z.string()).optional().describe('IDs of the contacts to assign as task assignees. Example: ["KUAZR5CO"].'),
        dates: z
            .object({
                start: z.string().optional().describe('Task start date in yyyy-MM-dd format. Requires a due date or duration.'),
                due: z.string().optional().describe('Task due date in yyyy-MM-dd format. Setting it alone creates a Milestone task.')
            })
            .optional()
            .describe('Scheduling dates for the task. When omitted, a Backlog task is created.'),
        superTasks: z.array(z.string()).optional().describe('IDs of existing tasks to create this task as a subtask of. Example: ["MAAAAAEQ_HoO"].')
    })
    .describe('Input for creating a Wrike task.');

const TaskDatesSchema = z.object({
    type: z.string().optional().describe('Task date type. Example: "Backlog", "Planned", "Milestone".'),
    start: z.string().optional().describe('Task start date.'),
    due: z.string().optional().describe('Task due date.'),
    duration: z.number().optional().describe('Task duration in minutes.')
});

const ProviderTaskSchema = z.object({
    id: z.string(),
    title: z.string(),
    description: z.string().optional(),
    briefDescription: z.string().optional(),
    status: z.string().optional(),
    importance: z.string().optional(),
    scope: z.string().optional(),
    parentIds: z.array(z.string()).optional(),
    superTaskIds: z.array(z.string()).optional(),
    subTaskIds: z.array(z.string()).optional(),
    responsibleIds: z.array(z.string()).optional(),
    authorIds: z.array(z.string()).optional(),
    customStatusId: z.string().optional(),
    permalink: z.string().optional(),
    createdDate: z.string().optional(),
    updatedDate: z.string().optional(),
    dates: TaskDatesSchema.optional()
});

const ProviderResponseSchema = z.object({
    kind: z.string().optional(),
    data: z.array(ProviderTaskSchema).min(1)
});

const OutputSchema = z
    .object({
        id: z.string().describe('Unique ID of the created task.'),
        title: z.string().describe('Title of the created task.'),
        description: z.string().optional().describe('Description of the created task.'),
        briefDescription: z.string().optional().describe('Plain-text summary of the task description.'),
        status: z.string().optional().describe('Task status. Example: "Active".'),
        importance: z.string().optional().describe('Task importance. Example: "Normal".'),
        scope: z.string().optional().describe('Task scope. "WsTask" for an active task, "RbTask" if the task is in the Recycle Bin.'),
        parentIds: z.array(z.string()).optional().describe('IDs of the folders or projects that contain the task.'),
        superTaskIds: z.array(z.string()).optional().describe('IDs of parent tasks when the task is a subtask.'),
        subTaskIds: z.array(z.string()).optional().describe('IDs of the task subtasks.'),
        responsibleIds: z.array(z.string()).optional().describe('IDs of users assigned to the task.'),
        authorIds: z.array(z.string()).optional().describe('IDs of the task authors.'),
        customStatusId: z.string().optional().describe('ID of the custom workflow status assigned to the task.'),
        permalink: z.string().optional().describe('URL to open the task in Wrike.'),
        createdDate: z.string().optional().describe('Creation timestamp in ISO 8601 format.'),
        updatedDate: z.string().optional().describe('Last modification timestamp in ISO 8601 format.'),
        dates: TaskDatesSchema.optional().describe('Scheduling dates of the created task.')
    })
    .describe('The newly created Wrike task.');

/**
 * @tags: [write]
 * @tagReason: Creates a new task in the provider, a mutating operation.
 * @pitfalls: Omitting dates creates a Backlog task and setting only due creates a Milestone; providing start without due or duration is rejected, and date-only start/due values are normalized to the account's work schedule with a computed duration.
 */
const action = createAction({
    description: 'Create a task inside a folder or project, optionally as a subtask of an existing task.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developers.wrike.com/reference/postfolderssingletasks
        const response = await nango.post({
            endpoint: `/folders/${encodeURIComponent(input.folderId)}/tasks`,
            data: {
                title: input.title,
                ...(input.description !== undefined && { description: input.description }),
                ...(input.responsibles !== undefined && { responsibles: input.responsibles }),
                ...(input.dates !== undefined && { dates: input.dates }),
                ...(input.superTasks !== undefined && { superTasks: input.superTasks })
            },
            // eslint-disable-next-line @nangohq/custom-integrations-linting/proxy-call-retries
            retries: 0 // Task creation is not idempotent: retrying after a lost response would create a duplicate task.
        });

        const parsed = ProviderResponseSchema.parse(response.data);
        const task = parsed.data[0];

        if (!task) {
            throw new Error('Wrike did not return the created task.');
        }

        return {
            id: task.id,
            title: task.title,
            ...(task.description !== undefined && { description: task.description }),
            ...(task.briefDescription !== undefined && { briefDescription: task.briefDescription }),
            ...(task.status !== undefined && { status: task.status }),
            ...(task.importance !== undefined && { importance: task.importance }),
            ...(task.scope !== undefined && { scope: task.scope }),
            ...(task.parentIds !== undefined && { parentIds: task.parentIds }),
            ...(task.superTaskIds !== undefined && { superTaskIds: task.superTaskIds }),
            ...(task.subTaskIds !== undefined && { subTaskIds: task.subTaskIds }),
            ...(task.responsibleIds !== undefined && { responsibleIds: task.responsibleIds }),
            ...(task.authorIds !== undefined && { authorIds: task.authorIds }),
            ...(task.customStatusId !== undefined && { customStatusId: task.customStatusId }),
            ...(task.permalink !== undefined && { permalink: task.permalink }),
            ...(task.createdDate !== undefined && { createdDate: task.createdDate }),
            ...(task.updatedDate !== undefined && { updatedDate: task.updatedDate }),
            ...(task.dates !== undefined && { dates: task.dates })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
