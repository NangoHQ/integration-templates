import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        project_id: z.number().describe('The project bucket ID the to-do belongs to.'),
        todo_id: z.number().describe('The ID of the to-do to update.'),
        content: z.string().describe('The to-do content. Required and cannot be blank.'),
        description: z.string().optional().describe('Rich-text description of the to-do.'),
        assignee_ids: z.array(z.number()).optional().describe('IDs of people to assign. Omitting clears existing assignees.'),
        completion_subscriber_ids: z.array(z.number()).optional().describe('IDs of people to notify on completion. Omitting clears existing subscribers.'),
        notify: z.boolean().optional().describe('When true, notifies assignees about being assigned.'),
        due_on: z.string().optional().describe('Due date in YYYY-MM-DD format.'),
        starts_on: z.string().optional().describe('Start date in YYYY-MM-DD format.')
    })
    .describe('Input parameters for updating a Basecamp to-do.');

const AssigneeSchema = z.object({
    id: z.number().describe('Person ID.'),
    name: z.string().describe('Person name.')
});

const OutputSchema = z
    .object({
        id: z.number().describe('The to-do ID.'),
        content: z.string().describe('The to-do content.'),
        description: z.string().describe('The to-do description.'),
        status: z.string().describe('The to-do status, e.g. active or drafted.'),
        completed: z.boolean().describe('Whether the to-do is completed.'),
        due_on: z.string().nullable().optional().describe('The due date in YYYY-MM-DD format.'),
        starts_on: z.string().nullable().optional().describe('The start date in YYYY-MM-DD format.'),
        assignees: z.array(AssigneeSchema).optional().describe('People assigned to the to-do.'),
        url: z.string().describe('API URL for the to-do.'),
        app_url: z.string().describe('App URL for the to-do.')
    })
    .describe('The updated Basecamp to-do record.');

const ProviderTodoSchema = z.object({
    id: z.number(),
    content: z.string(),
    description: z.string(),
    status: z.string(),
    completed: z.boolean(),
    due_on: z.string().nullable().optional(),
    starts_on: z.string().nullable().optional(),
    assignees: z.array(AssigneeSchema).optional(),
    url: z.string(),
    app_url: z.string()
});

/**
 * @tags: [write]
 * @tagReason: Updates an existing to-do via PUT, mutating the provider resource.
 * @pitfalls: This endpoint uses full-replacement semantics; omitting any optional field (including assignee_ids or due_on) clears its existing value on the provider.
 */
const action = createAction({
    description: "Update a to-do's content, description, dates, or assignees.",
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const requestBody: {
            content: string;
            description?: string;
            assignee_ids?: number[];
            completion_subscriber_ids?: number[];
            notify?: boolean;
            due_on?: string;
            starts_on?: string;
        } = {
            content: input.content
        };

        if (input.description !== undefined) {
            requestBody.description = input.description;
        }
        if (input.assignee_ids !== undefined) {
            requestBody.assignee_ids = input.assignee_ids;
        }
        if (input.completion_subscriber_ids !== undefined) {
            requestBody.completion_subscriber_ids = input.completion_subscriber_ids;
        }
        if (input.notify !== undefined) {
            requestBody.notify = input.notify;
        }
        if (input.due_on !== undefined) {
            requestBody.due_on = input.due_on;
        }
        if (input.starts_on !== undefined) {
            requestBody.starts_on = input.starts_on;
        }

        // https://github.com/basecamp/bc3-api/blob/master/sections/todos.md#update-a-to-do
        const response = await nango.put({
            endpoint: `/buckets/${encodeURIComponent(input.project_id)}/todos/${encodeURIComponent(input.todo_id)}.json`,
            data: requestBody,
            retries: 3
        });

        const parsed = ProviderTodoSchema.safeParse(response.data);
        if (!parsed.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Unexpected response from Basecamp API.'
            });
        }

        const todo = parsed.data;

        return {
            id: todo.id,
            content: todo.content,
            description: todo.description,
            status: todo.status,
            completed: todo.completed,
            due_on: todo.due_on,
            starts_on: todo.starts_on,
            assignees: todo.assignees,
            url: todo.url,
            app_url: todo.app_url
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
