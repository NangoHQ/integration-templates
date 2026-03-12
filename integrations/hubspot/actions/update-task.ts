import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    task_id: z.string().describe('The HubSpot task ID to update. Example: "12345"'),
    subject: z.string().optional().describe('The title of the task.'),
    body: z.string().optional().describe('The task notes/description.'),
    due_date: z.string().optional().describe('The task due date in ISO 8601 format or Unix timestamp in milliseconds.'),
    status: z.enum(['COMPLETED', 'NOT_STARTED']).optional().describe('The status of the task.'),
    priority: z.enum(['LOW', 'MEDIUM', 'HIGH']).optional().describe('The priority of the task.'),
    task_type: z.enum(['EMAIL', 'CALL', 'TODO']).optional().describe('The type of the task.'),
    owner_id: z.string().optional().describe('The HubSpot owner ID to assign the task to.'),
    reminder: z.string().optional().describe('Reminder timestamp in Unix milliseconds.')
});

const OutputSchema = z.object({
    id: z.string(),
    subject: z.union([z.string(), z.null()]),
    body: z.union([z.string(), z.null()]),
    due_date: z.union([z.string(), z.null()]),
    status: z.union([z.enum(['COMPLETED', 'NOT_STARTED']), z.null()]),
    priority: z.union([z.enum(['LOW', 'MEDIUM', 'HIGH']), z.null()]),
    task_type: z.union([z.enum(['EMAIL', 'CALL', 'TODO']), z.null()]),
    owner_id: z.union([z.string(), z.null()]),
    reminder: z.union([z.string(), z.null()]),
    created_at: z.union([z.string(), z.null()]),
    updated_at: z.union([z.string(), z.null()])
});

const action = createAction({
    description: "Update a HubSpot task's fields, owner, due date, and associations",
    version: '1.0.0',

    endpoint: {
        method: 'POST',
        path: '/actions/update-task',
        group: 'Tasks'
    },

    input: InputSchema,
    output: OutputSchema,
    scopes: ['crm.objects.contacts.write', 'crm.objects.contacts.read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const properties: Record<string, string> = {};

        if (input.subject !== undefined) properties['hs_task_subject'] = input.subject;
        if (input.body !== undefined) properties['hs_task_body'] = input.body;
        if (input.due_date !== undefined) properties['hs_timestamp'] = input.due_date;
        if (input.status !== undefined) properties['hs_task_status'] = input.status;
        if (input.priority !== undefined) properties['hs_task_priority'] = input.priority;
        if (input.task_type !== undefined) properties['hs_task_type'] = input.task_type;
        if (input.owner_id !== undefined) properties['hubspot_owner_id'] = input.owner_id;
        if (input.reminder !== undefined) properties['hs_task_reminders'] = input.reminder;

        // https://developers.hubspot.com/docs/api-reference/crm-tasks-v3/guide
        const response = await nango.patch({
            endpoint: `/crm/v3/objects/tasks/${input.task_id}`,
            data: { properties },
            retries: 10
        });

        const data = response.data;

        return {
            id: data.id,
            subject: data.properties?.['hs_task_subject'] ?? null,
            body: data.properties?.['hs_task_body'] ?? null,
            due_date: data.properties?.['hs_timestamp'] ?? null,
            status: data.properties?.['hs_task_status'] ?? null,
            priority: data.properties?.['hs_task_priority'] ?? null,
            task_type: data.properties?.['hs_task_type'] ?? null,
            owner_id: data.properties?.['hubspot_owner_id'] ?? null,
            reminder: data.properties?.['hs_task_reminders'] ?? null,
            created_at: data.createdAt ?? null,
            updated_at: data.updatedAt ?? null
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
