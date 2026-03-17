import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    ticketId: z.string().describe('HubSpot ticket ID. Example: "123456789"')
});

const OutputSchema = z.object({
    id: z.string(),
    subject: z.string().optional(),
    content: z.string().optional(),
    pipeline: z.string().optional(),
    pipelineStage: z.string().optional(),
    priority: z.string().optional(),
    source: z.string().optional(),
    status: z.string().optional(),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional()
});

const action = createAction({
    description: 'Get a ticket by ID',
    version: '1.0.0',

    endpoint: {
        method: 'GET',
        path: '/actions/get-ticket',
        group: 'Tickets'
    },

    input: InputSchema,
    output: OutputSchema,
    scopes: ['tickets'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://developers.hubspot.com/docs/api-reference/crm-tickets-v3/basic/get-crm-v3-objects-tickets-ticketId
            endpoint: `/crm/v3/objects/tickets/${input.ticketId}`,
            params: {
                properties:
                    'subject,content,hs_pipeline,hs_pipeline_stage,priority,hs_ticket_priority,source,hs_ticket_source,hs_ticket_category,hs_ticket_resolution,createdate,hs_lastmodifieddate,hs_object_id'
            },
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Ticket not found',
                ticketId: input.ticketId
            });
        }

        const data = response.data;

        return {
            id: data.id,
            subject: data.properties?.['subject'] ?? undefined,
            content: data.properties?.['content'] ?? undefined,
            pipeline: data.properties?.['hs_pipeline'] ?? undefined,
            pipelineStage: data.properties?.['hs_pipeline_stage'] ?? undefined,
            priority: data.properties?.['hs_ticket_priority'] ?? data.properties?.['priority'] ?? undefined,
            source: data.properties?.['hs_ticket_source'] ?? data.properties?.['source'] ?? undefined,
            status: data.properties?.['hs_ticket_category'] ?? undefined,
            createdAt: data.properties?.['createdate'] ?? data.createdAt ?? undefined,
            updatedAt: data.properties?.['hs_lastmodifieddate'] ?? data.updatedAt ?? undefined
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
