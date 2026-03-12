import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    ticket_id: z.string().describe('HubSpot ticket ID. Example: "123456789"')
});

const OutputSchema = z.object({
    id: z.string(),
    subject: z.union([z.string(), z.null()]),
    content: z.union([z.string(), z.null()]),
    pipeline: z.union([z.string(), z.null()]),
    pipeline_stage: z.union([z.string(), z.null()]),
    priority: z.union([z.string(), z.null()]),
    source: z.union([z.string(), z.null()]),
    status: z.union([z.string(), z.null()]),
    created_at: z.union([z.string(), z.null()]),
    updated_at: z.union([z.string(), z.null()])
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
            endpoint: `/crm/v3/objects/tickets/${input.ticket_id}`,
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
                ticket_id: input.ticket_id
            });
        }

        const data = response.data;

        return {
            id: data.id,
            subject: data.properties?.['subject'] ?? null,
            content: data.properties?.['content'] ?? null,
            pipeline: data.properties?.['hs_pipeline'] ?? null,
            pipeline_stage: data.properties?.['hs_pipeline_stage'] ?? null,
            priority: data.properties?.['hs_ticket_priority'] ?? data.properties?.['priority'] ?? null,
            source: data.properties?.['hs_ticket_source'] ?? data.properties?.['source'] ?? null,
            status: data.properties?.['hs_ticket_category'] ?? null,
            created_at: data.properties?.['createdate'] ?? data.createdAt ?? null,
            updated_at: data.properties?.['hs_lastmodifieddate'] ?? data.updatedAt ?? null
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
