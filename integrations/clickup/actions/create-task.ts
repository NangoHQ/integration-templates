import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    list_id: z.string().describe('The ID of the list to create the task in. Example: "901523451693"'),
    name: z.string().describe('The name of the task.'),
    description: z.string().optional().describe('The description of the task (supports Markdown).'),
    assignees: z.array(z.number()).optional().describe('Array of user IDs to assign to the task.'),
    status: z.string().optional().describe('The status of the task (e.g., "to do", "in progress", "complete").'),
    priority: z.number().int().min(1).max(4).optional().describe('Priority level: 1=urgent, 2=high, 3=normal, 4=low.'),
    due_date: z.number().optional().describe('Due date as Unix timestamp in milliseconds.'),
    start_date: z.number().optional().describe('Start date as Unix timestamp in milliseconds.'),
    time_estimate: z.number().optional().describe('Time estimate in milliseconds.'),
    tags: z.array(z.string()).optional().describe('Array of tag names to apply to the task.'),
    parent: z.string().optional().describe('ID of the parent task (for subtasks).')
});

const ProviderTaskSchema = z.object({
    id: z.string(),
    name: z.string(),
    text_content: z.string().nullable().optional(),
    description: z.string().nullable().optional(),
    status: z
        .object({
            status: z.string(),
            color: z.string().optional(),
            orderindex: z.number().optional(),
            type: z.string().optional()
        })
        .optional(),
    priority: z
        .object({
            id: z.string(),
            priority: z.string(),
            color: z.string(),
            orderindex: z.string()
        })
        .nullable()
        .optional(),
    due_date: z.string().nullable().optional(),
    start_date: z.string().nullable().optional(),
    time_estimate: z.string().nullable().optional(),
    list: z
        .object({
            id: z.string(),
            name: z.string()
        })
        .optional(),
    folder: z
        .object({
            id: z.string(),
            name: z.string(),
            hidden: z.boolean().optional(),
            access: z.boolean().optional()
        })
        .nullable()
        .optional(),
    space: z
        .object({
            id: z.string(),
            name: z.string().optional()
        })
        .optional(),
    tags: z
        .array(
            z.object({
                name: z.string(),
                tag_fg: z.string().optional(),
                tag_bg: z.string().optional(),
                creator: z.number().optional()
            })
        )
        .optional(),
    assignees: z
        .array(
            z.object({
                id: z.number(),
                username: z.string().optional(),
                email: z.string().optional(),
                color: z.string().optional(),
                profilePicture: z.string().nullable().optional(),
                initials: z.string().optional()
            })
        )
        .optional(),
    parent: z.string().nullable().optional(),
    url: z.string().optional(),
    creator: z
        .object({
            id: z.number(),
            username: z.string().optional(),
            email: z.string().optional(),
            color: z.string().optional(),
            initials: z.string().optional(),
            profilePicture: z.string().nullable().optional()
        })
        .optional(),
    created_at: z.string().optional()
});

const OutputSchema = z.object({
    id: z.string(),
    name: z.string(),
    text_content: z.string().optional(),
    description: z.string().optional(),
    status: z
        .object({
            status: z.string(),
            color: z.string().optional(),
            orderindex: z.number().optional(),
            type: z.string().optional()
        })
        .optional(),
    priority: z
        .object({
            id: z.string(),
            priority: z.string(),
            color: z.string(),
            orderindex: z.string()
        })
        .optional(),
    due_date: z.string().optional(),
    start_date: z.string().optional(),
    time_estimate: z.string().optional(),
    list: z
        .object({
            id: z.string(),
            name: z.string()
        })
        .optional(),
    folder: z
        .object({
            id: z.string(),
            name: z.string()
        })
        .optional(),
    space: z
        .object({
            id: z.string(),
            name: z.string().optional()
        })
        .optional(),
    tags: z
        .array(
            z.object({
                name: z.string(),
                tag_fg: z.string().optional(),
                tag_bg: z.string().optional(),
                creator: z.number().optional()
            })
        )
        .optional(),
    assignees: z
        .array(
            z.object({
                id: z.number(),
                username: z.string().optional(),
                email: z.string().optional(),
                color: z.string().optional(),
                profilePicture: z.string().nullable().optional(),
                initials: z.string().optional()
            })
        )
        .optional(),
    parent: z.string().optional(),
    url: z.string().optional(),
    creator: z
        .object({
            id: z.number(),
            username: z.string().optional(),
            email: z.string().optional(),
            color: z.string().optional(),
            initials: z.string().optional(),
            profilePicture: z.string().nullable().optional()
        })
        .optional(),
    created_at: z.string().optional()
});

const action = createAction({
    description: 'Create a task in ClickUp',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const requestBody: Record<string, unknown> = {
            name: input.name
        };

        if (input.description !== undefined) {
            requestBody['description'] = input.description;
        }
        if (input.assignees !== undefined) {
            requestBody['assignees'] = input.assignees;
        }
        if (input.status !== undefined) {
            requestBody['status'] = input.status;
        }
        if (input.priority !== undefined) {
            requestBody['priority'] = input.priority;
        }
        if (input.due_date !== undefined) {
            requestBody['due_date'] = String(input.due_date);
        }
        if (input.start_date !== undefined) {
            requestBody['start_date'] = String(input.start_date);
        }
        if (input.time_estimate !== undefined) {
            requestBody['time_estimate'] = String(input.time_estimate);
        }
        if (input.tags !== undefined) {
            requestBody['tags'] = input.tags;
        }
        if (input.parent !== undefined) {
            requestBody['parent'] = input.parent;
        }

        // https://developer.clickup.com/reference/api-tasks/create-task
        const response = await nango.post({
            endpoint: `/api/v2/list/${encodeURIComponent(input.list_id)}/task`,
            data: requestBody,
            retries: 10
        });

        const providerTask = ProviderTaskSchema.parse(response.data);

        return {
            id: providerTask.id,
            name: providerTask.name,
            ...(providerTask.text_content != null && { text_content: providerTask.text_content }),
            ...(providerTask.description != null && { description: providerTask.description }),
            ...(providerTask.status != null && { status: providerTask.status }),
            ...(providerTask.priority != null && { priority: providerTask.priority }),
            ...(providerTask.due_date != null && { due_date: providerTask.due_date }),
            ...(providerTask.start_date != null && { start_date: providerTask.start_date }),
            ...(providerTask.time_estimate != null && { time_estimate: providerTask.time_estimate }),
            ...(providerTask.list != null && { list: providerTask.list }),
            ...(providerTask.folder != null && { folder: { id: providerTask.folder.id, name: providerTask.folder.name } }),
            ...(providerTask.space != null && { space: providerTask.space }),
            ...(providerTask.tags != null && { tags: providerTask.tags }),
            ...(providerTask.assignees != null && { assignees: providerTask.assignees }),
            ...(providerTask.parent != null && { parent: providerTask.parent }),
            ...(providerTask.url != null && { url: providerTask.url }),
            ...(providerTask.creator != null && { creator: providerTask.creator }),
            ...(providerTask.created_at != null && { created_at: providerTask.created_at })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
