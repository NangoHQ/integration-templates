import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('Task ID. Example: "task_123"'),
    text: z.string().optional().describe('Task text/description. Only modifiable for lead-type tasks.'),
    assigned_to: z.string().optional().describe('User ID to assign the task to.'),
    date: z.string().optional().describe('Task date in ISO 8601 or date format. Example: "2026-07-01"'),
    due_date: z.string().optional().describe('Task due date in ISO 8601 or date format. Example: "2026-07-01T00:00:00+00:00"'),
    is_complete: z.boolean().optional().describe('Mark the task as complete.')
});

const ProviderTaskSchema = z.object({
    id: z.string(),
    lead_id: z.string(),
    assigned_to: z.string().nullable(),
    text: z.string(),
    date: z.string().nullable(),
    due_date: z.string().nullable().optional(),
    is_complete: z.boolean(),
    is_dateless: z.boolean(),
    date_created: z.string(),
    date_updated: z.string(),
    organization_id: z.string(),
    created_by: z.string(),
    updated_by: z.string(),
    contact_id: z.string().nullable(),
    contact_name: z.string().nullable(),
    lead_name: z.string().nullable(),
    created_by_name: z.string().nullable(),
    assigned_to_name: z.string().nullable(),
    updated_by_name: z.string().nullable(),
    object_id: z.string().nullable(),
    object_type: z.string().nullable(),
    _type: z.string()
});

const OutputSchema = z.object({
    id: z.string(),
    lead_id: z.string(),
    assigned_to: z.string().optional(),
    text: z.string(),
    date: z.string().optional(),
    due_date: z.string().optional(),
    is_complete: z.boolean(),
    is_dateless: z.boolean(),
    date_created: z.string(),
    date_updated: z.string(),
    organization_id: z.string(),
    created_by: z.string(),
    updated_by: z.string(),
    contact_id: z.string().optional(),
    contact_name: z.string().optional(),
    lead_name: z.string().optional(),
    created_by_name: z.string().optional(),
    assigned_to_name: z.string().optional(),
    updated_by_name: z.string().optional(),
    object_id: z.string().optional(),
    object_type: z.string().optional(),
    type: z.string().describe('Task type. Example: "lead"')
});

const action = createAction({
    description: 'Update a Close task',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['write:tasks'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.put({
            // https://developer.close.com/api/resources/tasks/update
            endpoint: `/v1/task/${encodeURIComponent(input.id)}/`,
            data: {
                ...(input.text !== undefined && { text: input.text }),
                ...(input.assigned_to !== undefined && { assigned_to: input.assigned_to }),
                ...(input.date !== undefined && { date: input.date }),
                ...(input.due_date !== undefined && { due_date: input.due_date }),
                ...(input.is_complete !== undefined && { is_complete: input.is_complete })
            },
            retries: 1
        });

        const providerTask = ProviderTaskSchema.parse(response.data);

        return {
            id: providerTask.id,
            lead_id: providerTask.lead_id,
            ...(providerTask.assigned_to != null && { assigned_to: providerTask.assigned_to }),
            text: providerTask.text,
            ...(providerTask.date != null && { date: providerTask.date }),
            ...(providerTask.due_date != null && { due_date: providerTask.due_date }),
            is_complete: providerTask.is_complete,
            is_dateless: providerTask.is_dateless,
            date_created: providerTask.date_created,
            date_updated: providerTask.date_updated,
            organization_id: providerTask.organization_id,
            created_by: providerTask.created_by,
            updated_by: providerTask.updated_by,
            ...(providerTask.contact_id != null && { contact_id: providerTask.contact_id }),
            ...(providerTask.contact_name != null && { contact_name: providerTask.contact_name }),
            ...(providerTask.lead_name != null && { lead_name: providerTask.lead_name }),
            ...(providerTask.created_by_name != null && { created_by_name: providerTask.created_by_name }),
            ...(providerTask.assigned_to_name != null && { assigned_to_name: providerTask.assigned_to_name }),
            ...(providerTask.updated_by_name != null && { updated_by_name: providerTask.updated_by_name }),
            ...(providerTask.object_id != null && { object_id: providerTask.object_id }),
            ...(providerTask.object_type != null && { object_type: providerTask.object_type }),
            type: providerTask._type
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
