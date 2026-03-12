import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    subject: z.string().describe('The title/subject of the task. Example: "Call John about the proposal"'),
    type: z
        .string()
        .optional()
        .describe(
            'The type of task. Example: "CALL", "EMAIL", "TODO", "MEETING", "LINKED_IN", "LINKED_IN_MESSAGE", "LINKED_IN_CONNECT", "WHATSAPP", "SMS", "NEXT_STEP", "SCHEDULE_MEETING", "DEMO". Defaults to "TODO"'
        ),
    priority: z.string().optional().describe('The priority of the task. Options: "LOW", "MEDIUM", "HIGH". Defaults to "MEDIUM"'),
    due_date: z.string().describe('The due date for the task in ISO 8601 format (e.g., "2024-03-15T10:00:00Z"). Example: "2024-03-15T10:00:00Z"'),
    notes: z.string().optional().describe('The body/notes of the task. Example: "Remember to mention the discount offer"'),
    assignee_id: z.string().optional().describe('The HubSpot owner ID (user ID) to assign the task to. Example: "12345678"'),
    contact_ids: z.array(z.string()).optional().describe('Array of contact IDs to associate the task with. Example: ["123", "456"]'),
    company_ids: z.array(z.string()).optional().describe('Array of company IDs to associate the task with. Example: ["789", "012"]'),
    deal_ids: z.array(z.string()).optional().describe('Array of deal IDs to associate the task with. Example: ["345", "678"]')
});

const OutputSchema = z.object({
    id: z.string().describe('The unique ID of the created task'),
    subject: z.union([z.string(), z.null()]).describe('The title/subject of the task'),
    type: z.union([z.string(), z.null()]).describe('The type of task'),
    priority: z.union([z.string(), z.null()]).describe('The priority of the task'),
    due_date: z.union([z.string(), z.null()]).describe('The due date of the task'),
    notes: z.union([z.string(), z.null()]).describe('The body/notes of the task'),
    status: z.union([z.string(), z.null()]).describe('The status of the task'),
    assignee_id: z.union([z.string(), z.null()]).describe('The HubSpot owner ID assigned to the task'),
    created_at: z.union([z.string(), z.null()]),
    updated_at: z.union([z.string(), z.null()])
});

const action = createAction({
    description: 'Create a HubSpot task with type, title, priority, assignee, due date, notes, and optional associations to contacts, companies, or deals',
    version: '1.0.0',

    endpoint: {
        method: 'POST',
        path: '/actions/create-task',
        group: 'Tasks'
    },

    input: InputSchema,
    output: OutputSchema,
    scopes: ['crm.objects.contacts.write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const properties: Record<string, string> = {
            hs_task_subject: input.subject,
            hs_task_type: input.type || 'TODO',
            hs_task_priority: input.priority || 'MEDIUM',
            hs_timestamp: input.due_date,
            hs_task_status: 'NOT_STARTED'
        };

        if (input.notes) {
            properties['hs_task_body'] = input.notes;
        }

        if (input.assignee_id) {
            properties['hubspot_owner_id'] = input.assignee_id;
        }

        const associations: Array<{ to: { id: string }; types: Array<{ associationCategory: string; associationTypeId: number }> }> = [];

        if (input.contact_ids && input.contact_ids.length > 0) {
            for (const contactId of input.contact_ids) {
                associations.push({
                    to: { id: contactId },
                    types: [{ associationCategory: 'HUBSPOT_DEFINED', associationTypeId: 204 }]
                });
            }
        }

        if (input.company_ids && input.company_ids.length > 0) {
            for (const companyId of input.company_ids) {
                associations.push({
                    to: { id: companyId },
                    types: [{ associationCategory: 'HUBSPOT_DEFINED', associationTypeId: 200 }]
                });
            }
        }

        if (input.deal_ids && input.deal_ids.length > 0) {
            for (const dealId of input.deal_ids) {
                associations.push({
                    to: { id: dealId },
                    types: [{ associationCategory: 'HUBSPOT_DEFINED', associationTypeId: 216 }]
                });
            }
        }

        const requestBody: {
            properties: Record<string, string>;
            associations?: Array<{ to: { id: string }; types: Array<{ associationCategory: string; associationTypeId: number }> }>;
        } = {
            properties
        };

        if (associations.length > 0) {
            requestBody.associations = associations;
        }

        const response = await nango.post({
            endpoint: '/crm/v3/objects/tasks',
            data: requestBody,
            retries: 10
        });

        const data = response.data;

        return {
            id: data.id,
            subject: data.properties?.['hs_task_subject'] ?? null,
            type: data.properties?.['hs_task_type'] ?? null,
            priority: data.properties?.['hs_task_priority'] ?? null,
            due_date: data.properties?.['hs_timestamp'] ?? null,
            notes: data.properties?.['hs_task_body'] ?? null,
            status: data.properties?.['hs_task_status'] ?? null,
            assignee_id: data.properties?.['hubspot_owner_id'] ?? null,
            created_at: data.createdAt ?? null,
            updated_at: data.updatedAt ?? null
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
