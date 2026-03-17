import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    ticketId: z.string().describe('The ID of the ticket to update. Example: "12345"'),
    subject: z.string().optional().describe('The subject of the ticket. Example: "Support Request"'),
    content: z.string().optional().describe('The content/body of the ticket. Example: "Issue details here"'),
    status: z.string().optional().describe('The status of the ticket. Example: "OPEN", "CLOSED", "WAITING"'),
    priority: z.string().optional().describe('The priority of the ticket. Example: "LOW", "MEDIUM", "HIGH"'),
    category: z.string().optional().describe('The category of the ticket. Example: "BUG", "FEATURE_REQUEST"'),
    pipeline: z.string().optional().describe('The pipeline the ticket belongs to. Example: "123"'),
    pipelineStage: z.string().optional().describe('The stage of the ticket in the pipeline. Example: "456"'),
    ownerId: z.string().optional().describe('The ID of the ticket owner. Example: "12345"')
});

const OutputSchema = z.object({
    id: z.string(),
    subject: z.string().optional(),
    content: z.string().optional(),
    status: z.string().optional(),
    priority: z.string().optional(),
    category: z.string().optional(),
    pipeline: z.string().optional(),
    pipelineStage: z.string().optional(),
    ownerId: z.string().optional(),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional()
});

const action = createAction({
    description: 'Update a support ticket',
    version: '1.0.0',

    endpoint: {
        method: 'POST',
        path: '/actions/update-ticket',
        group: 'Tickets'
    },

    input: InputSchema,
    output: OutputSchema,
    scopes: ['crm.objects.tickets.write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const properties: Record<string, string> = {};

        if (input.subject) properties['subject'] = input.subject;
        if (input.content) properties['content'] = input.content;
        if (input.status) properties['hs_ticket_priority'] = input.status;
        if (input.priority) properties['hs_ticket_priority'] = input.priority;
        if (input.category) properties['hs_ticket_category'] = input.category;
        if (input.pipeline) properties['hs_pipeline'] = input.pipeline;
        if (input.pipelineStage) properties['hs_pipeline_stage'] = input.pipelineStage;
        if (input.ownerId) properties['hubspot_owner_id'] = input.ownerId;

        // https://developers.hubspot.com/docs/api-reference/crm/objects/tickets
        const response = await nango.patch({
            endpoint: `/crm/v3/objects/tickets/${input.ticketId}`,
            data: { properties },
            retries: 3
        });

        const data = response.data;

        return {
            id: data.id,
            subject: data.properties?.['subject'] ?? undefined,
            content: data.properties?.['content'] ?? undefined,
            status: data.properties?.['hs_ticket_priority'] ?? undefined,
            priority: data.properties?.['hs_ticket_priority'] ?? undefined,
            category: data.properties?.['hs_ticket_category'] ?? undefined,
            pipeline: data.properties?.['hs_pipeline'] ?? undefined,
            pipelineStage: data.properties?.['hs_pipeline_stage'] ?? undefined,
            ownerId: data.properties?.['hubspot_owner_id'] ?? undefined,
            createdAt: data.createdAt ?? undefined,
            updatedAt: data.updatedAt ?? undefined
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
