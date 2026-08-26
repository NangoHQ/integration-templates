import { z } from 'zod';
import { createAction } from 'nango';

const ListInput = z
    .object({
        ticket_id: z.number().describe('Ticket ID to list messages for'),
        cursor: z.string().optional().describe('Pagination cursor from the previous response'),
        limit: z.number().optional().describe('Maximum number of messages per page')
    })
    .describe('Input for listing ticket messages');

const ProviderResponseSchema = z.object({
    data: z.array(z.object({}).passthrough()),
    meta: z
        .object({
            next_cursor: z.string().optional().nullable()
        })
        .optional()
});

const ProviderMessageSchema = z
    .object({
        id: z.number(),
        ticket_id: z.number(),
        body: z.string().optional(),
        body_text: z.string().optional().nullable(),
        channel: z.string().optional(),
        created_datetime: z.string().optional(),
        updated_datetime: z.string().optional(),
        from_agent: z.boolean().optional().nullable(),
        via: z.string().optional().nullable(),
        source: z.object({}).passthrough().optional().nullable(),
        sender: z.object({}).passthrough().optional().nullable(),
        attachments: z.array(z.object({}).passthrough()).optional().nullable()
    })
    .passthrough();

const MessageSchema = z
    .object({
        id: z.number().describe('Message ID'),
        ticket_id: z.number().describe('Ticket ID'),
        body: z.string().optional().describe('Message body in HTML'),
        body_text: z.string().optional().describe('Message body in plain text'),
        channel: z.string().optional().describe('Channel type, e.g. email, phone, sms'),
        created_datetime: z.string().optional().describe('Creation timestamp in ISO8601 format'),
        updated_datetime: z.string().optional().describe('Update timestamp in ISO8601 format'),
        from_agent: z.boolean().optional().describe('Whether the message was sent by an agent'),
        via: z.string().optional().describe('Integration or channel source'),
        source: z.object({}).passthrough().optional().describe('Message source metadata'),
        sender: z.object({}).passthrough().optional().describe('Message sender metadata'),
        attachments: z.array(z.object({}).passthrough()).optional().describe('Message attachments')
    })
    .describe('A ticket message');

const ListOutput = z
    .object({
        items: z.array(MessageSchema).describe('Array of ticket messages'),
        next_cursor: z.string().optional().describe('Cursor for the next page of results')
    })
    .describe('Output for listing ticket messages');

/**
 * @tags: [read]
 * @tagReason: Reads messages from an existing ticket.
 * @pitfalls: The provider returns body_html instead of body and omits updated_datetime, so both fields are always missing from the output.
 */
const action = createAction({
    description: 'List messages on a specific ticket',
    version: '1.0.0',
    input: ListInput,
    output: ListOutput,

    exec: async (nango, input): Promise<z.infer<typeof ListOutput>> => {
        const response = await nango.get({
            // https://developers.gorgias.com/reference/list-ticket-messages
            endpoint: `/api/tickets/${encodeURIComponent(`${input.ticket_id}`)}/messages`,
            params: {
                ...(input.cursor !== undefined && { cursor: input.cursor }),
                ...(input.limit !== undefined && { limit: input.limit })
            },
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        const items = providerResponse.data.map((item) => {
            const message = ProviderMessageSchema.parse(item);
            return {
                id: message.id,
                ticket_id: message.ticket_id,
                ...(message.body !== undefined && { body: message.body }),
                ...(message.body_text != null && { body_text: message.body_text }),
                ...(message.channel !== undefined && { channel: message.channel }),
                ...(message.created_datetime !== undefined && { created_datetime: message.created_datetime }),
                ...(message.updated_datetime !== undefined && { updated_datetime: message.updated_datetime }),
                ...(message.from_agent != null && { from_agent: message.from_agent }),
                ...(message.via != null && { via: message.via }),
                ...(message.source != null && { source: message.source }),
                ...(message.sender != null && { sender: message.sender }),
                ...(message.attachments != null && { attachments: message.attachments })
            };
        });

        return {
            items,
            ...(providerResponse.meta?.next_cursor != null && { next_cursor: providerResponse.meta.next_cursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
