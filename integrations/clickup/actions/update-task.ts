import { z } from 'zod';
import { createAction } from 'nango';

const PriorityEnum = z
    .union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)])
    .describe('Priority level: 1 = Urgent, 2 = High, 3 = Normal, 4 = Low')
    .optional();

const AssigneesSchema = z
    .object({
        add: z.array(z.string()).optional().describe('Array of user IDs to add as assignees'),
        rem: z.array(z.string()).optional().describe('Array of user IDs to remove from assignees')
    })
    .optional();

const InputSchema = z.object({
    task_id: z.string().describe('ClickUp task ID. Example: "86c9w2nke"'),
    name: z.string().optional().describe('New name for the task'),
    description: z.string().optional().describe('New description for the task'),
    status: z.string().optional().describe('Status of the task'),
    priority: PriorityEnum,
    due_date: z.number().optional().describe('Due date in milliseconds since epoch'),
    due_date_time: z.boolean().optional().describe('Whether due_date includes time'),
    parent: z.string().optional().describe('Parent task ID'),
    time_estimate: z.number().optional().describe('Time estimate in milliseconds'),
    start_date: z.number().optional().describe('Start date in milliseconds since epoch'),
    start_date_time: z.boolean().optional().describe('Whether start_date includes time'),
    assignees: AssigneesSchema,
    archived: z.boolean().optional().describe('Whether to archive the task')
});

const CreatorSchema = z.object({
    id: z.number(),
    username: z.string(),
    color: z.string(),
    email: z.string(),
    profilePicture: z.string().nullable().optional()
});

const StatusSchema = z.object({
    id: z.string(),
    status: z.string(),
    color: z.string(),
    orderindex: z.number(),
    type: z.string()
});

const PriorityResponseSchema = z.object({
    id: z.string(),
    priority: z.string(),
    color: z.string(),
    orderindex: z.string()
});

const AssigneeSchema = z.object({
    id: z.number(),
    username: z.string(),
    color: z.string(),
    initials: z.string(),
    email: z.string(),
    profilePicture: z.string().nullable(),
    role: z.number().optional()
});

const SpaceSchema = z.object({
    id: z.string()
});

const FolderSchema = z.object({
    id: z.string()
});

const ListSchema = z.object({
    id: z.string()
});

const ProviderTaskSchema = z.object({
    id: z.string(),
    custom_id: z.string().nullable(),
    name: z.string(),
    text_content: z.string().nullable(),
    description: z.string().nullable(),
    status: StatusSchema,
    orderindex: z.string(),
    date_created: z.string(),
    date_updated: z.string(),
    date_closed: z.string().nullable(),
    date_done: z.string().nullable(),
    archived: z.boolean(),
    creator: CreatorSchema,
    assignees: z.array(AssigneeSchema),
    watchers: z.array(AssigneeSchema),
    checklists: z.array(z.unknown()),
    tags: z.array(z.unknown()),
    parent: z.string().nullable(),
    priority: PriorityResponseSchema.nullable(),
    due_date: z.string().nullable(),
    start_date: z.string().nullable(),
    points: z.number().nullable(),
    time_estimate: z.number().nullable(),
    custom_fields: z.array(z.unknown()),
    dependencies: z.array(z.unknown()),
    linked_tasks: z.array(z.unknown()),
    team_id: z.string(),
    url: z.string(),
    list: ListSchema,
    project: z.unknown().nullable(),
    folder: FolderSchema.nullable(),
    space: SpaceSchema,
    attachments: z.array(z.unknown())
});

const OutputSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    description: z.string().optional(),
    status: z.string().optional(),
    priority: z.number().optional(),
    due_date: z.string().optional(),
    start_date: z.string().optional(),
    time_estimate: z.number().optional(),
    archived: z.boolean().optional(),
    parent: z.string().optional(),
    assignees: z.array(z.string()).optional(),
    url: z.string().optional()
});

const action = createAction({
    description: 'Update a task in ClickUp',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/update-task',
        group: 'Tasks'
    },
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const body: Record<string, unknown> = {};

        if (input['name'] !== undefined) {
            body['name'] = input['name'];
        }
        if (input['description'] !== undefined) {
            body['description'] = input['description'];
        }
        if (input['status'] !== undefined) {
            body['status'] = input['status'];
        }
        if (input['priority'] !== undefined) {
            body['priority'] = input['priority'];
        }
        if (input['due_date'] !== undefined) {
            body['due_date'] = input['due_date'];
        }
        if (input['due_date_time'] !== undefined) {
            body['due_date_time'] = input['due_date_time'];
        }
        if (input['parent'] !== undefined) {
            body['parent'] = input['parent'];
        }
        if (input['time_estimate'] !== undefined) {
            body['time_estimate'] = input['time_estimate'];
        }
        if (input['start_date'] !== undefined) {
            body['start_date'] = input['start_date'];
        }
        if (input['start_date_time'] !== undefined) {
            body['start_date_time'] = input['start_date_time'];
        }
        if (input['assignees'] !== undefined) {
            body['assignees'] = input['assignees'];
        }
        if (input['archived'] !== undefined) {
            body['archived'] = input['archived'];
        }

        // https://developer.clickup.com/reference/updatetask
        const response = await nango.put({
            endpoint: `/api/v2/task/${encodeURIComponent(input['task_id'])}`,
            data: body,
            retries: 3
        });

        const providerTask = ProviderTaskSchema.parse(response.data);

        const priorityValue = providerTask.priority ? parseInt(providerTask.priority.orderindex, 10) : undefined;

        return {
            id: providerTask.id,
            ...(providerTask.name && { name: providerTask.name }),
            ...(providerTask.description != null && { description: providerTask.description }),
            ...(providerTask.status && { status: providerTask.status.status }),
            ...(priorityValue !== undefined && { priority: priorityValue }),
            ...(providerTask.due_date != null && { due_date: providerTask.due_date }),
            ...(providerTask.start_date != null && { start_date: providerTask.start_date }),
            ...(providerTask.time_estimate != null && { time_estimate: providerTask.time_estimate }),
            ...(providerTask.archived !== undefined && { archived: providerTask.archived }),
            ...(providerTask.parent != null && { parent: providerTask.parent }),
            ...(providerTask.assignees.length > 0 && {
                assignees: providerTask.assignees.map((a) => String(a.id))
            }),
            ...(providerTask.url && { url: providerTask.url })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
