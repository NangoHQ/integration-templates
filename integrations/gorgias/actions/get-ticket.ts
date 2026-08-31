import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        ticket_id: z.number().describe('The unique identifier of the ticket to retrieve. Example: 82682724')
    })
    .describe('Input for retrieving a single Gorgias ticket.');

const MessageSchema = z.object({
    id: z.number().describe('Unique identifier of the message.'),
    body_text: z.string().nullable().optional().describe('Plain text body of the message.'),
    body_html: z.string().nullable().optional().describe('HTML body of the message.'),
    channel: z.string().describe('Channel the message was sent through. Example: "email" or "phone".'),
    from_agent: z.boolean().describe('Whether the message was sent by an agent.'),
    public: z.boolean().describe('Whether the message is visible to the customer.'),
    created_datetime: z.string().describe('ISO 8601 timestamp when the message was created.')
});

const OutputSchema = z
    .object({
        id: z.number().describe('Unique identifier of the ticket.'),
        subject: z.string().nullable().optional().describe('Subject line of the ticket.'),
        status: z.string().describe('Current status of the ticket. Example: "open" or "closed".'),
        channel: z.string().nullable().optional().describe('Primary channel of the ticket. Example: "email" or "phone".'),
        created_datetime: z.string().describe('ISO 8601 timestamp when the ticket was created.'),
        updated_datetime: z.string().describe('ISO 8601 timestamp when the ticket was last updated.'),
        messages: z.array(MessageSchema).describe('Full list of messages attached to the ticket.')
    })
    .describe('A single Gorgias ticket including its full messages array.');

/**
 * @tags: [read]
 * @tagReason: Performs a single GET request to retrieve an existing ticket.
 * @pitfalls: List endpoints return tickets without full message bodies; call this action to backfill complete messages.
 */
const action = createAction({
    description: 'Retrieve a single ticket, including its full messages array.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['tickets:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://developers.gorgias.com/reference/get-ticket
            endpoint: `/api/tickets/${encodeURIComponent(input.ticket_id)}`,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Ticket not found',
                ticket_id: input.ticket_id
            });
        }

        const ticket = OutputSchema.parse(response.data);
        return ticket;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
