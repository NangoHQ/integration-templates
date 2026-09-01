import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        ticket_id: z.number().describe('The ID of the ticket associated with the message. Example: 82682724'),
        message_id: z.number().describe('The ID of the message to retrieve. Example: 924712')
    })
    .describe('Input to retrieve a single ticket message.');

const SourceAddressSchema = z.object({
    name: z.string().optional().describe('The display name of the address.'),
    address: z.string().optional().describe('The email address or other routing identifier.')
});

const SourceSchema = z.object({
    type: z.string().optional().describe('The detailed channel type of the message source.'),
    from: SourceAddressSchema.optional().describe('The sender address information.'),
    to: z.array(SourceAddressSchema).optional().describe('The receiver addresses.')
});

const UserOrCustomerSchema = z.object({
    id: z.number().optional().describe('The ID of the user or customer.'),
    email: z.string().optional().describe('The email address.'),
    name: z.string().optional().describe('The full name.'),
    firstname: z.string().optional().describe('The first name.'),
    lastname: z.string().optional().describe('The last name.')
});

const AttachmentSchema = z.object({
    url: z.string().optional().describe('The URL to access the attached file.'),
    name: z.string().optional().describe('The name of the file.'),
    size: z.number().optional().describe('The size of the file in bytes.'),
    content_type: z.string().optional().describe('The MIME type of the file.'),
    public: z.boolean().optional().describe('Whether the attachment is publicly accessible.')
});

const OutputSchema = z
    .object({
        id: z.number().describe('The ID of the message.'),
        uri: z.string().optional().describe('The URI of the message.'),
        message_id: z.string().optional().describe('The ID of the message on the external service.'),
        ticket_id: z.number().optional().describe('The ID of the ticket the message belongs to.'),
        external_id: z.string().optional().describe('The ID of the message in a foreign system.'),
        public: z.boolean().optional().describe('Whether the message was sent to or received from a customer.'),
        channel: z.string().optional().describe('The channel used to send or receive the message.'),
        via: z.string().optional().describe('How the message was received or sent from Gorgias.'),
        source: SourceSchema.optional().describe('Routing information for the message.'),
        sender: UserOrCustomerSchema.optional().describe('The person who sent the message.'),
        receiver: UserOrCustomerSchema.optional().describe('The primary receiver of the message.'),
        subject: z.string().optional().describe('The subject of the message.'),
        body_text: z.string().optional().describe('The full text version of the message body.'),
        body_html: z.string().optional().describe('The full HTML version of the message body.'),
        stripped_text: z.string().optional().describe('The text body without signatures and previous replies.'),
        stripped_html: z.string().optional().describe('The HTML body without signatures and previous replies.'),
        from_agent: z.boolean().optional().describe('Whether the message was sent by your company to a customer.'),
        integration_id: z.number().optional().describe('The ID of the integration that sent or received the message.'),
        rule_id: z.number().optional().describe('The ID of the rule that sent the message, if any.'),
        attachments: z.array(AttachmentSchema).optional().describe('Files attached to the message.'),
        created_datetime: z.string().optional().describe('When the message was created.'),
        sent_datetime: z.string().optional().describe('When the message was sent.'),
        failed_datetime: z.string().optional().describe('When the message failed to be sent.'),
        opened_datetime: z.string().optional().describe('When the message was opened by the primary receiver.'),
        processed_datetime: z.string().optional().describe('When the message was processed by Gorgias.'),
        imported: z.boolean().optional().describe('Whether the message was created by a historical import.'),
        is_retriable: z.boolean().optional().describe('Whether the message can be retried.'),
        meta: z.object({}).passthrough().optional().describe('Metadata associated with the message.')
    })
    .describe('A single ticket message retrieved from Gorgias.');

const ProviderMessageSchema = z.object({
    id: z.number(),
    uri: z.string().optional().nullable(),
    message_id: z.string().optional().nullable(),
    ticket_id: z.number().optional().nullable(),
    external_id: z.string().optional().nullable(),
    public: z.boolean().optional().nullable(),
    channel: z.string().optional().nullable(),
    via: z.string().optional().nullable(),
    source: z
        .object({
            type: z.string().optional().nullable(),
            from: z
                .object({
                    name: z.string().optional().nullable(),
                    address: z.string().optional().nullable()
                })
                .optional()
                .nullable(),
            to: z
                .array(
                    z.object({
                        name: z.string().optional().nullable(),
                        address: z.string().optional().nullable()
                    })
                )
                .optional()
                .nullable()
        })
        .optional()
        .nullable(),
    sender: z
        .object({
            id: z.number().optional().nullable(),
            email: z.string().optional().nullable(),
            name: z.string().optional().nullable(),
            firstname: z.string().optional().nullable(),
            lastname: z.string().optional().nullable()
        })
        .optional()
        .nullable(),
    receiver: z
        .object({
            id: z.number().optional().nullable(),
            email: z.string().optional().nullable(),
            name: z.string().optional().nullable(),
            firstname: z.string().optional().nullable(),
            lastname: z.string().optional().nullable()
        })
        .optional()
        .nullable(),
    subject: z.string().optional().nullable(),
    body_text: z.string().optional().nullable(),
    body_html: z.string().optional().nullable(),
    stripped_text: z.string().optional().nullable(),
    stripped_html: z.string().optional().nullable(),
    from_agent: z.boolean().optional().nullable(),
    integration_id: z.number().optional().nullable(),
    rule_id: z.number().optional().nullable(),
    attachments: z
        .array(
            z.object({
                url: z.string().optional().nullable(),
                name: z.string().optional().nullable(),
                size: z.number().optional().nullable(),
                content_type: z.string().optional().nullable(),
                public: z.boolean().optional().nullable()
            })
        )
        .optional()
        .nullable(),
    created_datetime: z.string().optional().nullable(),
    sent_datetime: z.string().optional().nullable(),
    failed_datetime: z.string().optional().nullable(),
    opened_datetime: z.string().optional().nullable(),
    processed_datetime: z.string().optional().nullable(),
    imported: z.boolean().optional().nullable(),
    is_retriable: z.boolean().optional().nullable(),
    meta: z.object({}).passthrough().optional().nullable()
});

/**
 * @tags: [read]
 * @tagReason: Retrieves a single message from the Gorgias API.
 * @pitfalls: The output `message_id` is the external service ID, not the internal Gorgias `id`, and is often `null`; `attachments` may be `null` instead of an empty array.
 */
const action = createAction({
    description: 'Retrieve a single message on a ticket.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['tickets:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developers.gorgias.com/reference/get-ticket-message
        const response = await nango.get({
            endpoint: `/api/tickets/${encodeURIComponent(input.ticket_id)}/messages/${encodeURIComponent(input.message_id)}`,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Ticket message not found.',
                ticket_id: input.ticket_id,
                message_id: input.message_id
            });
        }

        const providerMessage = ProviderMessageSchema.parse(response.data);

        return {
            id: providerMessage.id,
            ...(providerMessage.uri != null && { uri: providerMessage.uri }),
            ...(providerMessage.message_id != null && { message_id: providerMessage.message_id }),
            ...(providerMessage.ticket_id != null && { ticket_id: providerMessage.ticket_id }),
            ...(providerMessage.external_id != null && { external_id: providerMessage.external_id }),
            ...(providerMessage.public != null && { public: providerMessage.public }),
            ...(providerMessage.channel != null && { channel: providerMessage.channel }),
            ...(providerMessage.via != null && { via: providerMessage.via }),
            ...(providerMessage.source != null && {
                source: {
                    ...(providerMessage.source.type != null && { type: providerMessage.source.type }),
                    ...(providerMessage.source.from != null && {
                        from: {
                            ...(providerMessage.source.from.name != null && { name: providerMessage.source.from.name }),
                            ...(providerMessage.source.from.address != null && { address: providerMessage.source.from.address })
                        }
                    }),
                    ...(providerMessage.source.to != null && {
                        to: providerMessage.source.to.map((item) => ({
                            ...(item.name != null && { name: item.name }),
                            ...(item.address != null && { address: item.address })
                        }))
                    })
                }
            }),
            ...(providerMessage.sender != null && {
                sender: {
                    ...(providerMessage.sender.id != null && { id: providerMessage.sender.id }),
                    ...(providerMessage.sender.email != null && { email: providerMessage.sender.email }),
                    ...(providerMessage.sender.name != null && { name: providerMessage.sender.name }),
                    ...(providerMessage.sender.firstname != null && { firstname: providerMessage.sender.firstname }),
                    ...(providerMessage.sender.lastname != null && { lastname: providerMessage.sender.lastname })
                }
            }),
            ...(providerMessage.receiver != null && {
                receiver: {
                    ...(providerMessage.receiver.id != null && { id: providerMessage.receiver.id }),
                    ...(providerMessage.receiver.email != null && { email: providerMessage.receiver.email }),
                    ...(providerMessage.receiver.name != null && { name: providerMessage.receiver.name }),
                    ...(providerMessage.receiver.firstname != null && { firstname: providerMessage.receiver.firstname }),
                    ...(providerMessage.receiver.lastname != null && { lastname: providerMessage.receiver.lastname })
                }
            }),
            ...(providerMessage.subject != null && { subject: providerMessage.subject }),
            ...(providerMessage.body_text != null && { body_text: providerMessage.body_text }),
            ...(providerMessage.body_html != null && { body_html: providerMessage.body_html }),
            ...(providerMessage.stripped_text != null && { stripped_text: providerMessage.stripped_text }),
            ...(providerMessage.stripped_html != null && { stripped_html: providerMessage.stripped_html }),
            ...(providerMessage.from_agent != null && { from_agent: providerMessage.from_agent }),
            ...(providerMessage.integration_id != null && { integration_id: providerMessage.integration_id }),
            ...(providerMessage.rule_id != null && { rule_id: providerMessage.rule_id }),
            ...(providerMessage.attachments != null && {
                attachments: providerMessage.attachments.map((item) => ({
                    ...(item.url != null && { url: item.url }),
                    ...(item.name != null && { name: item.name }),
                    ...(item.size != null && { size: item.size }),
                    ...(item.content_type != null && { content_type: item.content_type }),
                    ...(item.public != null && { public: item.public })
                }))
            }),
            ...(providerMessage.created_datetime != null && { created_datetime: providerMessage.created_datetime }),
            ...(providerMessage.sent_datetime != null && { sent_datetime: providerMessage.sent_datetime }),
            ...(providerMessage.failed_datetime != null && { failed_datetime: providerMessage.failed_datetime }),
            ...(providerMessage.opened_datetime != null && { opened_datetime: providerMessage.opened_datetime }),
            ...(providerMessage.processed_datetime != null && { processed_datetime: providerMessage.processed_datetime }),
            ...(providerMessage.imported != null && { imported: providerMessage.imported }),
            ...(providerMessage.is_retriable != null && { is_retriable: providerMessage.is_retriable }),
            ...(providerMessage.meta != null && { meta: providerMessage.meta })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
