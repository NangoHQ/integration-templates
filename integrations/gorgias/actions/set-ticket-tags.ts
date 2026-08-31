import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        ticket_id: z.number().describe('The ID of the ticket whose tags will be replaced.'),
        tag_ids: z.array(z.number()).optional().describe('IDs of existing tags to set on the ticket. Either tag_ids or tag_names must be provided.'),
        tag_names: z.array(z.string()).optional().describe('Names of existing tags to set on the ticket. Either tag_ids or tag_names must be provided.')
    })
    .describe('Input for replacing all tags on a ticket with a given set of existing tags.');

const ProviderTagSchema = z.object({
    id: z.number().describe('The unique identifier of the tag.'),
    name: z.string().describe('The name of the tag.'),
    uri: z.string().optional().describe('The URI of the tag resource.'),
    created_datetime: z.string().optional().describe('The ISO 8601 datetime when the tag was created.'),
    updated_datetime: z.string().optional().describe('The ISO 8601 datetime when the tag was last updated.')
});

const TicketResponseSchema = z.object({
    id: z.number(),
    tags: z.array(ProviderTagSchema).optional()
});

const OutputSchema = z
    .object({
        ticket_id: z.number().describe('The ID of the updated ticket.'),
        tags: z.array(ProviderTagSchema).describe('The complete list of tags now assigned to the ticket.')
    })
    .describe('Output containing the updated ticket ID and its current tag list.');

/**
 * @tags: [write, destructive]
 * @tagReason: Replaces the entire tag list on a ticket, which removes any previously assigned tags not included in the new set.
 * @pitfalls: Tags must already exist in the account; passing unknown tag names or IDs will fail.
 */
const action = createAction({
    description: "Replace a ticket's full tag list with the given set of existing tags.",
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['tickets:write', 'tickets:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        if (!input.tag_ids && !input.tag_names) {
            throw new nango.ActionError({
                type: 'missing_input',
                message: 'Either tag_ids or tag_names must be provided.'
            });
        }

        const data: Record<string, unknown> = {};
        if (input.tag_ids) {
            data['ids'] = input.tag_ids;
        }
        if (input.tag_names) {
            data['names'] = input.tag_names;
        }

        await nango.put({
            // https://developers.gorgias.com/reference/put-tickets-id-tags
            endpoint: `/api/tickets/${encodeURIComponent(input.ticket_id)}/tags`,
            data,
            retries: 3
        });

        const ticketResponse = await nango.get({
            // https://developers.gorgias.com/reference/get-tickets-id
            endpoint: `/api/tickets/${encodeURIComponent(input.ticket_id)}`,
            retries: 3
        });

        const parsedTicket = TicketResponseSchema.safeParse(ticketResponse.data);
        if (!parsedTicket.success) {
            throw new nango.ActionError({
                type: 'unexpected_response',
                message: 'Failed to parse ticket response after updating tags.'
            });
        }

        return {
            ticket_id: input.ticket_id,
            tags: parsedTicket.data.tags || []
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
