import { createSync, ProxyConfiguration } from 'nango';
import { z } from 'zod';

const TicketMessageAttachmentSchema = z.object({
    url: z.string().nullable(),
    name: z.string().nullable(),
    size: z.number().int().nullable(),
    content_type: z.string().nullable(),
    public: z.boolean().nullable()
});

const TicketMessageUserOrCustomerSchema = z.object({
    id: z.number().int().nullable(),
    email: z.string().nullable(),
    name: z.string().nullable(),
    firstname: z.string().nullable(),
    lastname: z.string().nullable()
});

const TicketMessageSourceAddressSchema = z.object({
    name: z.string().nullable(),
    address: z.string().nullable()
});

const TicketMessageSourceSchema = z.object({
    type: z.string().nullable(),
    to: z.array(TicketMessageSourceAddressSchema).nullish(),
    cc: z.array(TicketMessageSourceAddressSchema).nullish(),
    bcc: z.array(TicketMessageSourceAddressSchema).nullish(),
    from: TicketMessageSourceAddressSchema.nullish()
});

const TicketMessageSendingErrorSchema = z.object({
    error: z.string().nullable()
});

const TicketMessageIntentSchema = z.object({
    name: z.string().nullable(),
    rejected: z.boolean().nullable(),
    is_user_feedback: z.boolean().nullable()
});

const TicketMessageMacroSchema = z.object({
    id: z.number().int().nullable()
});

const TicketMessageAuthCustomerIdentitySchema = z.object({
    service: z
        .object({
            id: z.string().nullable(),
            name: z.string().nullable()
        })
        .nullable(),
    identifier: z.string().nullable()
});

const TicketMessageRepliedByOrToSchema = z.object({
    integration_id: z.number().int().nullable(),
    message_id: z.string().nullable(),
    created_datetime: z.string().nullable(),
    body_text: z.string().nullable()
});

const TicketMessageSchema = z.object({
    id: z.number().int(),
    uri: z.string().nullable(),
    message_id: z.string().nullable(),
    ticket_id: z.number().int().nullable(),
    external_id: z.string().nullable(),
    public: z.boolean().nullable(),
    channel: z.string().nullable(),
    via: z.string().nullable(),
    source: TicketMessageSourceSchema.nullable(),
    sender: TicketMessageUserOrCustomerSchema.nullable(),
    auth_customer_identity: TicketMessageAuthCustomerIdentitySchema.nullable(),
    integration_id: z.number().int().nullable(),
    intents: z.array(TicketMessageIntentSchema).nullable(),
    rule_id: z.number().int().nullable(),
    from_agent: z.boolean().nullable(),
    receiver: TicketMessageUserOrCustomerSchema.nullable(),
    subject: z.string().nullable(),
    body_text: z.string().nullable(),
    body_html: z.string().nullable(),
    stripped_text: z.string().nullable(),
    stripped_html: z.string().nullable(),
    stripped_signature: z.string().nullable(),
    attachments: z.array(TicketMessageAttachmentSchema).nullable(),
    macros: z.array(TicketMessageMacroSchema).nullish(),
    actions: z.array(z.record(z.string(), z.unknown())).nullable(),
    headers: z.record(z.string(), z.unknown()).nullish(),
    imported: z.boolean().nullable(),
    meta: z.record(z.string(), z.unknown()).nullable(),
    created_datetime: z.string().nullable(),
    processed_datetime: z.string().nullable(),
    deleted_datetime: z.string().nullish(),
    sent_datetime: z.string().nullable(),
    failed_datetime: z.string().nullable(),
    opened_datetime: z.string().nullable(),
    last_sending_error: TicketMessageSendingErrorSchema.nullable(),
    is_retriable: z.boolean().nullable(),
    replied_by: TicketMessageRepliedByOrToSchema.nullish(),
    replied_to: TicketMessageRepliedByOrToSchema.nullish()
});

const TicketMessageModelSchema = z
    .object({
        id: z.string().describe('Stable string identifier of the message.'),
        message_id: z.string().optional().describe('ID of the message on the external service that sent it.'),
        ticket_id: z.string().optional().describe('The ID of the ticket the message is associated with.'),
        external_id: z.string().optional().describe('ID of the message in a foreign system.'),
        public: z.boolean().optional().describe('Whether the message was sent or received by a customer. Internal notes are not public.'),
        channel: z.string().optional().describe('The channel used to send or receive the message.'),
        via: z.string().optional().describe('How the message was received or sent from Gorgias.'),
        integration_id: z.string().optional().describe('ID of the integration that either received or sent the message.'),
        rule_id: z.string().optional().describe('ID of the rule which sent the message, if any.'),
        from_agent: z.boolean().optional().describe('Whether the message was sent by the company to a customer.'),
        sender_id: z.string().optional().describe('ID of the person who sent the message.'),
        sender_email: z.string().optional().describe('Email of the person who sent the message.'),
        sender_name: z.string().optional().describe('Name of the person who sent the message.'),
        receiver_id: z.string().optional().describe('ID of the primary receiver of the message.'),
        receiver_email: z.string().optional().describe('Email of the primary receiver of the message.'),
        receiver_name: z.string().optional().describe('Name of the primary receiver of the message.'),
        subject: z.string().optional().describe('The subject of the message.'),
        body_text: z.string().optional().describe('The full text version of the body of the message.'),
        body_html: z.string().optional().describe('The full HTML version of the body of the message.'),
        stripped_text: z.string().optional().describe('The text version of the body without email signatures and previous replies.'),
        stripped_html: z.string().optional().describe('The HTML version of the body without email signatures and previous replies.'),
        created_datetime: z.string().optional().describe('When the message was created.'),
        processed_datetime: z.string().optional().describe('When the message was processed by Gorgias.'),
        sent_datetime: z.string().optional().describe('When the message was sent.'),
        failed_datetime: z.string().optional().describe('When the message failed to be sent.'),
        opened_datetime: z.string().optional().describe('When the message was opened by the primary receiver.'),
        deleted_datetime: z.string().optional().describe('When the message was deleted.'),
        imported: z.boolean().optional().describe('Whether the message was created by a historical import.'),
        is_retriable: z.boolean().optional().describe('Whether the message can be retried.'),
        source_type: z.string().optional().describe('Detailed channel information of how the message was sent or received.'),
        attachments: z
            .array(
                z
                    .object({
                        url: z.string().optional().describe('The URL to access the attached file.'),
                        name: z.string().optional().describe('The name of the attached file.'),
                        size: z.number().int().optional().describe('The size of the file in bytes.'),
                        content_type: z.string().optional().describe('The MIME type of the file.'),
                        public: z.boolean().optional().describe('Whether the attachment can be accessed.')
                    })
                    .optional()
            )
            .optional()
            .describe('Files attached to the message.')
    })
    .describe(
        'A ticket message represents a message under a normalized format. There are three types: outgoing messages sent by the company, incoming messages sent by customers, and internal notes sent between support agents.'
    );

const sync = createSync({
    description: 'Sync messages across all tickets.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    models: {
        TicketMessage: TicketMessageModelSchema
    },

    exec: async (nango) => {
        await nango.trackDeletesStart('TicketMessage');

        const proxyConfig: ProxyConfiguration = {
            // https://developers.gorgias.com/reference/list-messages
            endpoint: '/api/messages',
            params: {
                order_by: 'created_datetime:asc'
            },
            paginate: {
                type: 'cursor',
                cursor_path_in_response: 'meta.next_cursor',
                cursor_name_in_request: 'cursor',
                response_path: 'data',
                limit_name_in_request: 'limit',
                limit: 100
            },
            retries: 3
        };

        for await (const page of nango.paginate(proxyConfig)) {
            const items = Array.isArray(page) ? page : [];
            const records = items.map((item: unknown) => {
                const parsed = TicketMessageSchema.safeParse(item);
                if (!parsed.success) {
                    throw new Error(`Failed to validate ticket message: ${parsed.error.message}`);
                }
                const message = parsed.data;

                return {
                    id: String(message.id),
                    ...(message.message_id != null && { message_id: message.message_id }),
                    ...(message.ticket_id != null && { ticket_id: String(message.ticket_id) }),
                    ...(message.external_id != null && { external_id: message.external_id }),
                    ...(message.public != null && { public: message.public }),
                    ...(message.channel != null && { channel: message.channel }),
                    ...(message.via != null && { via: message.via }),
                    ...(message.integration_id != null && { integration_id: String(message.integration_id) }),
                    ...(message.rule_id != null && { rule_id: String(message.rule_id) }),
                    ...(message.from_agent != null && { from_agent: message.from_agent }),
                    ...(message.sender?.id != null && { sender_id: String(message.sender.id) }),
                    ...(message.sender?.email != null && { sender_email: message.sender.email }),
                    ...(message.sender?.name != null && { sender_name: message.sender.name }),
                    ...(message.receiver?.id != null && { receiver_id: String(message.receiver.id) }),
                    ...(message.receiver?.email != null && { receiver_email: message.receiver.email }),
                    ...(message.receiver?.name != null && { receiver_name: message.receiver.name }),
                    ...(message.subject != null && { subject: message.subject }),
                    ...(message.body_text != null && { body_text: message.body_text }),
                    ...(message.body_html != null && { body_html: message.body_html }),
                    ...(message.stripped_text != null && { stripped_text: message.stripped_text }),
                    ...(message.stripped_html != null && { stripped_html: message.stripped_html }),
                    ...(message.created_datetime != null && { created_datetime: message.created_datetime }),
                    ...(message.processed_datetime != null && { processed_datetime: message.processed_datetime }),
                    ...(message.sent_datetime != null && { sent_datetime: message.sent_datetime }),
                    ...(message.failed_datetime != null && { failed_datetime: message.failed_datetime }),
                    ...(message.opened_datetime != null && { opened_datetime: message.opened_datetime }),
                    ...(message.deleted_datetime != null && { deleted_datetime: message.deleted_datetime }),
                    ...(message.imported != null && { imported: message.imported }),
                    ...(message.is_retriable != null && { is_retriable: message.is_retriable }),
                    ...(message.source?.type != null && { source_type: message.source.type }),
                    ...(message.attachments != null &&
                        message.attachments.length > 0 && {
                            attachments: message.attachments.map((att) => ({
                                ...(att.url != null && { url: att.url }),
                                ...(att.name != null && { name: att.name }),
                                ...(att.size != null && { size: att.size }),
                                ...(att.content_type != null && { content_type: att.content_type }),
                                ...(att.public != null && { public: att.public })
                            }))
                        })
                };
            });

            if (records.length > 0) {
                await nango.batchSave(records, 'TicketMessage');
            }
        }

        await nango.trackDeletesEnd('TicketMessage');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
