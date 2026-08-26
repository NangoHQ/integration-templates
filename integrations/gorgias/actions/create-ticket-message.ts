import { z } from 'zod';
import { createAction } from 'nango';

const SenderInputSchema = z
    .object({
        id: z.number().optional().describe('ID of the customer or user sending the message.'),
        email: z.string().optional().describe('Email of the sender.'),
        name: z.string().optional().describe('Name of the sender.')
    })
    .describe('The person who sent the message. Must include at least one identifying field such as id or email.');

const InputSchema = z
    .object({
        ticket_id: z.number().describe('The ID of the ticket to add the message to.'),
        channel: z.string().describe('Channel used to send the message. Use "phone" to avoid a required source envelope.'),
        from_agent: z.boolean().describe('Whether the message was sent by your company.'),
        body_text: z.string().describe('Text version of the body of the message.'),
        body_html: z.string().optional().describe('HTML version of the body of the message.'),
        sender: SenderInputSchema.describe('Person who sent the message. It can be a user or a customer.'),
        via: z.string().describe('How the message has been received or sent from Gorgias.')
    })
    .describe('Input for adding a new message to an existing ticket.');

const SenderOutputSchema = z
    .object({
        id: z.number().optional().describe('ID of the sender.'),
        email: z.string().optional().describe('Email of the sender.'),
        name: z.string().optional().describe('Name of the sender.')
    })
    .describe('Sender of the message.');

const OutputSchema = z
    .object({
        id: z.number().describe('ID of the created message.'),
        ticket_id: z.number().describe('The ID of the ticket the message is associated with.'),
        channel: z.string().describe('The channel used to send the message.'),
        from_agent: z.boolean().describe('Whether the message was sent by your company.'),
        body_text: z.string().optional().describe('The full text version of the body of the message.'),
        body_html: z.string().optional().describe('The full HTML version of the body of the message.'),
        via: z.string().describe('How the message has been received or sent from Gorgias.'),
        sender: SenderOutputSchema.optional().describe('The person who sent the message.'),
        created_datetime: z.string().optional().describe('When the message was created.'),
        uri: z.string().optional().describe('URI of the message.')
    })
    .describe('The created ticket message.');

const ProviderMessageSchema = z.object({
    id: z.number(),
    ticket_id: z.number(),
    channel: z.string(),
    from_agent: z.boolean(),
    body_text: z.string().optional().nullable(),
    body_html: z.string().optional().nullable(),
    via: z.string(),
    sender: z
        .object({
            id: z.number().optional(),
            email: z.string().optional(),
            name: z.string().optional()
        })
        .optional()
        .nullable(),
    created_datetime: z.string().optional().nullable(),
    uri: z.string().optional().nullable()
});

/**
 * @tags: [write]
 * @tagReason: Creates a new message on the provider via POST /api/tickets/{ticket_id}/messages.
 * @pitfalls: Use channel "phone" to avoid requiring a source envelope; email-channel messages without a source.from object will 400. Messages are sent asynchronously, so the returned sent_datetime may initially be null and update later.
 */
const action = createAction({
    description: 'Add a new message to an existing ticket.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['tickets:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developers.gorgias.com/reference/create-ticket-message
        const response = await nango.post({
            endpoint: `/api/tickets/${encodeURIComponent(input.ticket_id)}/messages`,
            data: {
                channel: input.channel,
                from_agent: input.from_agent,
                body_text: input.body_text,
                ...(input.body_html !== undefined && { body_html: input.body_html }),
                sender: input.sender,
                via: input.via
            },
            retries: 3
        });

        const providerMessage = ProviderMessageSchema.parse(response.data);

        return {
            id: providerMessage.id,
            ticket_id: providerMessage.ticket_id,
            channel: providerMessage.channel,
            from_agent: providerMessage.from_agent,
            ...(providerMessage.body_text != null && { body_text: providerMessage.body_text }),
            ...(providerMessage.body_html != null && { body_html: providerMessage.body_html }),
            via: providerMessage.via,
            ...(providerMessage.sender != null && {
                sender: {
                    ...(providerMessage.sender.id != null && { id: providerMessage.sender.id }),
                    ...(providerMessage.sender.email != null && { email: providerMessage.sender.email }),
                    ...(providerMessage.sender.name != null && { name: providerMessage.sender.name })
                }
            }),
            ...(providerMessage.created_datetime != null && { created_datetime: providerMessage.created_datetime }),
            ...(providerMessage.uri != null && { uri: providerMessage.uri })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
