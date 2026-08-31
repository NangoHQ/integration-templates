import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        ticket_id: z.number().describe('The ID of the ticket associated with the message to update.'),
        message_id: z.number().describe('The ID of the message to update.'),
        body_text: z.string().optional().nullable().describe('The full text version of the body of the message.'),
        body_html: z.string().optional().nullable().describe('The full HTML version of the body of the message.'),
        subject: z.string().optional().nullable().describe('The subject of the message.'),
        action: z.enum(['force', 'retry', 'cancel']).optional().describe('Policy applied on external actions associated with the message if they failed.')
    })
    .describe('Input to update a ticket message.');

const OutputSchema = z
    .object({
        id: z.number().describe('ID of the message.'),
        ticket_id: z.number().describe('The ID of the ticket the message is associated with.'),
        body_text: z.string().optional().describe('The full text version of the body of the message.'),
        body_html: z.string().optional().describe('The full HTML version of the body of the message.'),
        subject: z.string().optional().describe('The subject of the message.'),
        channel: z.string().describe('The channel used to send the message.'),
        from_agent: z.boolean().describe('Whether the message was sent by your company to a customer.'),
        created_datetime: z.string().describe('When the message was created.'),
        uri: z.string().describe('URI of the message.')
    })
    .describe('Updated ticket message.');

const MessageSchema = z.object({
    id: z.number(),
    ticket_id: z.number(),
    channel: z.string(),
    from_agent: z.boolean(),
    body_text: z.string().nullable().optional(),
    body_html: z.string().nullable().optional(),
    subject: z.string().nullable().optional(),
    created_datetime: z.string(),
    uri: z.string(),
    source: z.object({}).passthrough().nullable().optional(),
    sender: z.object({}).passthrough().nullable().optional(),
    receiver: z.object({}).passthrough().nullable().optional()
});

/**
 * @tags: [read, write]
 * @tagReason: Reads the existing message before updating its fields.
 * @pitfalls: Updating body_text does not automatically update body_html; provide both fields to keep them in sync.
 */
const action = createAction({
    description: "Update a message's fields (e.g. body_text/body_html).",
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['tickets:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developers.gorgias.com/reference/get-ticket-message
        const getResponse = await nango.get({
            endpoint: `/api/tickets/${encodeURIComponent(input.ticket_id)}/messages/${encodeURIComponent(input.message_id)}`,
            retries: 3
        });

        if (!getResponse.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Message not found'
            });
        }

        const existingMessage = MessageSchema.parse(getResponse.data);

        const updateBody: Record<string, unknown> = {
            channel: existingMessage.channel,
            from_agent: existingMessage.from_agent,
            ...(existingMessage.source !== undefined && { source: existingMessage.source }),
            ...(existingMessage.sender !== undefined && { sender: existingMessage.sender }),
            ...(existingMessage.receiver !== undefined && { receiver: existingMessage.receiver }),
            ...(input.body_text !== undefined && { body_text: input.body_text }),
            ...(input.body_html !== undefined && { body_html: input.body_html }),
            ...(input.subject !== undefined && { subject: input.subject })
        };

        // https://developers.gorgias.com/reference/update-ticket-message
        const response = await nango.put({
            endpoint: `/api/tickets/${encodeURIComponent(input.ticket_id)}/messages/${encodeURIComponent(input.message_id)}`,
            ...(input.action !== undefined && { params: { action: input.action } }),
            data: updateBody,
            retries: 3
        });

        const updatedMessage = MessageSchema.parse(response.data);

        return {
            id: updatedMessage.id,
            ticket_id: updatedMessage.ticket_id,
            channel: updatedMessage.channel,
            from_agent: updatedMessage.from_agent,
            created_datetime: updatedMessage.created_datetime,
            uri: updatedMessage.uri,
            ...(updatedMessage.body_text != null && { body_text: updatedMessage.body_text }),
            ...(updatedMessage.body_html != null && { body_html: updatedMessage.body_html }),
            ...(updatedMessage.subject != null && { subject: updatedMessage.subject })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
