import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        ticket_id: z.number().describe('Freshdesk ticket ID to reply to. Example: 141'),
        body: z.string().describe('Reply content in HTML format. Example: "<div>We are working on this issue.</div>"'),
        from_email: z.string().optional().describe('Email address from which the reply is sent. Defaults to the global support email.'),
        user_id: z.number().optional().describe('ID of the agent adding the reply.'),
        cc_emails: z.array(z.string()).optional().describe('Email addresses to include in the CC field of the outgoing ticket email.'),
        bcc_emails: z.array(z.string()).optional().describe('Email addresses to include in the BCC field of the outgoing ticket email.')
    })
    .describe('Input to reply to a Freshdesk ticket.');

const ProviderAttachmentSchema = z.object({
    id: z.number(),
    content_type: z.string(),
    file_name: z.string(),
    size: z.number(),
    created_at: z.string(),
    updated_at: z.string(),
    attachment_url: z.string()
});

const ProviderReplySchema = z.object({
    id: z.number(),
    ticket_id: z.number(),
    body: z.string(),
    body_text: z.string(),
    user_id: z.number(),
    from_email: z.string().optional(),
    cc_emails: z.array(z.string()).optional(),
    bcc_emails: z.array(z.string()).optional(),
    replied_to: z.array(z.string()).optional(),
    attachments: z.array(ProviderAttachmentSchema).optional(),
    created_at: z.string(),
    updated_at: z.string()
});

const AttachmentSchema = z.object({
    id: z.number().describe('Attachment ID.'),
    content_type: z.string().describe('MIME type of the attachment.'),
    file_name: z.string().describe('Name of the attached file.'),
    size: z.number().describe('Size of the attachment in bytes.'),
    created_at: z.string().describe('Timestamp when the attachment was created. Format: ISO 8601.'),
    updated_at: z.string().describe('Timestamp when the attachment was last updated. Format: ISO 8601.'),
    attachment_url: z.string().describe('URL to download the attachment.')
});

const OutputSchema = z
    .object({
        id: z.number().describe('ID of the created conversation reply.'),
        ticket_id: z.number().describe('ID of the ticket this reply belongs to.'),
        body: z.string().describe('Reply content in HTML format.'),
        body_text: z.string().describe('Reply content in plain text format.'),
        user_id: z.number().describe('ID of the agent who added the reply.'),
        from_email: z.string().optional().describe('Email address from which the reply was sent.'),
        cc_emails: z.array(z.string()).optional().describe('Email addresses included in the CC field.'),
        bcc_emails: z.array(z.string()).optional().describe('Email addresses included in the BCC field.'),
        replied_to: z.array(z.string()).optional().describe('Email addresses this reply was sent to.'),
        attachments: z.array(AttachmentSchema).optional().describe('Attachments associated with the reply.'),
        created_at: z.string().describe('Timestamp when the reply was created. Format: ISO 8601.'),
        updated_at: z.string().describe('Timestamp when the reply was last updated. Format: ISO 8601.')
    })
    .describe('Output of a Freshdesk ticket reply.');

/**
 * @tags: [write]
 * @tagReason: Creates a public reply on a Freshdesk ticket.
 * @pitfalls: Webchat and mobile SDK tickets require structured_body instead of body; standard HTML replies are not sufficient for those ticket types.
 */
const action = createAction({
    description: 'Reply to a Freshdesk ticket.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['tickets:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const requestBody: Record<string, unknown> = {
            body: input.body,
            ...(input.from_email !== undefined && { from_email: input.from_email }),
            ...(input.user_id !== undefined && { user_id: input.user_id }),
            ...(input.cc_emails !== undefined && { cc_emails: input.cc_emails }),
            ...(input.bcc_emails !== undefined && { bcc_emails: input.bcc_emails })
        };

        const response = await nango.post({
            // https://developers.freshdesk.com/api/#reply_ticket
            endpoint: `/api/v2/tickets/${encodeURIComponent(input.ticket_id)}/reply`,
            data: requestBody,
            // eslint-disable-next-line @nangohq/custom-integrations-linting/proxy-call-retries -- non-idempotent create/mutation; retries must be 0
            retries: 0
        });

        const providerReply = ProviderReplySchema.parse(response.data);

        return {
            id: providerReply.id,
            ticket_id: providerReply.ticket_id,
            body: providerReply.body,
            body_text: providerReply.body_text,
            user_id: providerReply.user_id,
            ...(providerReply.from_email !== undefined && { from_email: providerReply.from_email }),
            ...(providerReply.cc_emails !== undefined && { cc_emails: providerReply.cc_emails }),
            ...(providerReply.bcc_emails !== undefined && { bcc_emails: providerReply.bcc_emails }),
            ...(providerReply.replied_to !== undefined && { replied_to: providerReply.replied_to }),
            ...(providerReply.attachments !== undefined && { attachments: providerReply.attachments }),
            created_at: providerReply.created_at,
            updated_at: providerReply.updated_at
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
