import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    lead_id: z.string().describe('Lead ID. Example: "lead_abc123"'),
    text: z.string().describe('Task description text'),
    date: z.string().optional().describe('Task date in YYYY-MM-DD format. Omit for a dateless task.'),
    assigned_to: z.string().optional().describe('User ID to assign the task to'),
    is_complete: z.boolean().optional().describe('Whether the task is complete. Defaults to false'),
    priority: z.enum(['low', 'medium', 'high']).optional().describe('Task priority. Defaults to medium'),
    contact_id: z.string().optional().describe('Contact ID associated with the task')
});

const ProviderTaskSchema = z.object({
    _type: z.string(),
    assigned_to: z.string().nullable(),
    assigned_to_name: z.string().nullable(),
    contact_id: z.string().nullable(),
    contact_name: z.string().nullable(),
    created_by: z.string().nullable(),
    created_by_name: z.string().nullable(),
    date: z.string().nullable(),
    date_created: z.string(),
    date_updated: z.string(),
    id: z.string(),
    is_complete: z.boolean(),
    is_dateless: z.boolean(),
    lead_id: z.string(),
    lead_name: z.string().nullable(),
    object_id: z.string().nullable(),
    object_type: z.string().nullable(),
    organization_id: z.string(),
    text: z.string().nullable(),
    updated_by: z.string().nullable(),
    updated_by_name: z.string().nullable()
});

const OutputSchema = z.object({
    id: z.string(),
    lead_id: z.string(),
    contact_id: z.string().optional(),
    text: z.string().optional(),
    assigned_to: z.string().optional(),
    date: z.string().optional(),
    is_complete: z.boolean(),
    is_dateless: z.boolean(),
    date_created: z.string(),
    date_updated: z.string(),
    organization_id: z.string()
});

const action = createAction({
    description: 'Create a Close task',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['all.full_access'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://developer.close.com/api/resources/tasks/create
            endpoint: '/v1/task/',
            data: {
                _type: 'lead',
                lead_id: input.lead_id,
                text: input.text,
                ...(input.date !== undefined && { date: input.date }),
                ...(input.assigned_to !== undefined && { assigned_to: input.assigned_to }),
                ...(input.is_complete !== undefined && { is_complete: input.is_complete }),
                ...(input.priority !== undefined && { priority: input.priority }),
                ...(input.contact_id !== undefined && { contact_id: input.contact_id })
            },
            retries: 10
        });

        const task = ProviderTaskSchema.parse(response.data);

        return {
            id: task.id,
            lead_id: task.lead_id,
            ...(task.contact_id != null && { contact_id: task.contact_id }),
            ...(task.text != null && { text: task.text }),
            ...(task.assigned_to != null && { assigned_to: task.assigned_to }),
            ...(task.date != null && { date: task.date }),
            is_complete: task.is_complete,
            is_dateless: task.is_dateless,
            date_created: task.date_created,
            date_updated: task.date_updated,
            organization_id: task.organization_id
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
