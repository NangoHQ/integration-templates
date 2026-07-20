import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    contactId: z.string().describe('Contact ID. Example: "jKy701hlSIPdiw0x12WA"'),
    title: z.string().describe('Task title. Example: "Follow up with lead"'),
    dueDate: z.string().describe('ISO 8601 due date. Example: "2026-07-20T10:00:00Z"'),
    completed: z.boolean().describe('Whether the task is completed.'),
    body: z.string().optional().describe('Task body/description.'),
    assignedTo: z.string().optional().describe('User ID to assign the task to.')
});

const ProviderTaskSchema = z.object({
    id: z.string(),
    title: z.string(),
    body: z.string().optional(),
    assignedTo: z.string().optional(),
    dueDate: z.string().optional(),
    completed: z.boolean().optional(),
    contactId: z.string().optional()
});

const ProviderResponseSchema = z.object({
    task: ProviderTaskSchema
});

const OutputSchema = z.object({
    id: z.string(),
    title: z.string(),
    body: z.string().optional(),
    assignedTo: z.string().optional(),
    dueDate: z.string().optional(),
    completed: z.boolean().optional(),
    contactId: z.string().optional()
});

const action = createAction({
    description: 'Create a follow-up task on a contact.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['contacts.write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const data: Record<string, unknown> = {
            title: input.title,
            dueDate: input.dueDate,
            completed: input.completed
        };

        if (input.body !== undefined) {
            data['body'] = input.body;
        }

        if (input.assignedTo !== undefined) {
            data['assignedTo'] = input.assignedTo;
        }

        const response = await nango.post({
            // https://highlevel.stoplight.io/docs/integrations/Create-Task
            endpoint: `/contacts/${encodeURIComponent(input.contactId)}/tasks`,
            headers: {
                Version: '2021-07-28'
            },
            data,
            retries: 3
        });

        const parsed = ProviderResponseSchema.safeParse(response.data);

        if (!parsed.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Provider returned an unexpected response shape.',
                details: parsed.error.issues
            });
        }

        const task = parsed.data.task;

        return {
            id: task.id,
            title: task.title,
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
