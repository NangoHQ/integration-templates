import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    contactId: z.string().describe('Contact ID. Example: "jKy701hlSIPdiw0x12WA"'),
    taskId: z.string().describe('Task ID. Example: "lJpzYrWdpkC2hX6t2yue"'),
    title: z.string().optional().describe('Task title'),
    body: z.string().optional().describe('Task body/description'),
    dueDate: z.string().optional().describe('Due date in ISO 8601 format. Example: "2020-10-25T11:00:00Z"'),
    completed: z.boolean().optional().describe('Whether the task is completed'),
    assignedTo: z.string().optional().describe('User ID to assign the task to')
});

const ProviderTaskSchema = z.object({
    id: z.string(),
    title: z.string().optional(),
    body: z.string().optional(),
    assignedTo: z.string().optional(),
    dueDate: z.string().optional(),
    completed: z.boolean().optional(),
    contactId: z.string().optional()
});

const OutputSchema = z.object({
    id: z.string(),
    title: z.string().optional(),
    body: z.string().optional(),
    assignedTo: z.string().optional(),
    dueDate: z.string().optional(),
    completed: z.boolean().optional(),
    contactId: z.string().optional()
});

const action = createAction({
    description: 'Update a follow-up task on a contact, e.g. mark it complete.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['contacts.write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.put({
            // https://highlevel.stoplight.io/docs/integrations/844ebf6a65c8d-update-task
            endpoint: `/contacts/${encodeURIComponent(input.contactId)}/tasks/${encodeURIComponent(input.taskId)}`,
            headers: {
                Version: '2021-07-28'
            },
            data: {
                ...(input.title !== undefined && { title: input.title }),
                ...(input.body !== undefined && { body: input.body }),
                ...(input.dueDate !== undefined && { dueDate: input.dueDate }),
                ...(input.completed !== undefined && { completed: input.completed }),
                ...(input.assignedTo !== undefined && { assignedTo: input.assignedTo })
            },
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Task not found or update failed',
                contactId: input.contactId,
                taskId: input.taskId
            });
        }

        const rawTask = z
            .object({
                task: ProviderTaskSchema
            })
            .safeParse(response.data);

        if (!rawTask.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Provider returned an unexpected response shape',
                details: rawTask.error.issues
            });
        }

        const task = rawTask.data.task;

        return {
            id: task.id,
            ...(task.title !== undefined && { title: task.title }),
            ...(task.body !== undefined && { body: task.body }),
            ...(task.assignedTo !== undefined && { assignedTo: task.assignedTo }),
            ...(task.dueDate !== undefined && { dueDate: task.dueDate }),
            ...(task.completed !== undefined && { completed: task.completed }),
            ...(task.contactId !== undefined && { contactId: task.contactId })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
