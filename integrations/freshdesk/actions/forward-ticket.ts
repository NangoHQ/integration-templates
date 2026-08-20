import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const InputSchema = z
    .object({
        ticket_id: z.number().describe('The ID of the ticket to forward.'),
        to_emails: z.array(z.string().describe('An email address to forward the ticket to.')).describe('Email addresses to forward the ticket to.'),
        body: z.string().describe('Content of the forward note in HTML format.'),
        body_text: z.string().optional().describe('Content of the forward note in plain text.'),
        cc_emails: z
            .array(z.string().describe('An email address to include in the CC field.'))
            .optional()
            .describe('Email addresses to include in the CC field of the outgoing forward email.'),
        bcc_emails: z
            .array(z.string().describe('An email address to include in the BCC field.'))
            .optional()
            .describe('Email addresses to include in the BCC field of the outgoing forward email.'),
        from_email: z.string().optional().describe('The email address from which the forward is sent. Defaults to the global support email.'),
        include_quoted_text: z.boolean().optional().describe('Include quoted text conversations in the forwarded email. Defaults to true.'),
        include_original_attachments: z.boolean().optional().describe('Include ticket attachments in the forwarded email. Defaults to true.'),
        private: z.boolean().optional().describe('Set to true if the forward note is private.'),
        agent_id: z.number().optional().describe('ID of the agent who is forwarding the ticket.')
    })
    .describe('Input for forwarding a Freshdesk ticket to external email addresses.');

const ProviderConversationSchema = z.object({
    body: z.string(),
    body_text: z.string(),
    id: z.number(),
    incoming: z.boolean(),
    private: z.boolean(),
    user_id: z.number(),
    support_email: z.string().nullable(),
    source: z.number(),
    category: z.number(),
    ticket_id: z.number(),
    to_emails: z.array(z.string()),
    from_email: z.string(),
    cc_emails: z.array(z.string()),
    bcc_emails: z.array(z.string()),
    email_failure_count: z.number().nullable(),
    outgoing_failures: z.unknown().nullable(),
    created_at: z.string(),
    updated_at: z.string(),
    attachments: z.array(z.unknown()),
    deleted: z.boolean(),
    last_edited_at: z.string().nullable(),
    last_edited_user_id: z.number().nullable(),
    cloud_files: z.array(z.unknown()),
    has_quoted_text: z.boolean()
});

const OutputSchema = z
    .object({
        id: z.number().describe('ID of the created forward conversation.'),
        ticket_id: z.number().describe('ID of the ticket that was forwarded.'),
        body: z.string().describe('Content of the forward note in HTML format.'),
        body_text: z.string().describe('Content of the forward note in plain text.'),
        to_emails: z.array(z.string()).describe('Email addresses the ticket was forwarded to.'),
        from_email: z.string().describe('Email address from which the forward was sent.'),
        cc_emails: z.array(z.string()).describe('Email addresses in the CC field.'),
        bcc_emails: z.array(z.string()).describe('Email addresses in the BCC field.'),
        user_id: z.number().describe('ID of the agent who forwarded the ticket.'),
        support_email: z.string().optional().describe('Support email address used for forwarding.'),
        source: z.number().describe('Type of the conversation.'),
        category: z.number().describe('Category of the conversation.'),
        incoming: z.boolean().describe('Whether the conversation appears as created from outside.'),
        private: z.boolean().describe('Whether the note is private.'),
        has_quoted_text: z.boolean().describe('Whether the forward includes quoted text.'),
        deleted: z.boolean().describe('Whether the conversation has been deleted.'),
        created_at: z.string().describe('Creation timestamp in UTC.'),
        updated_at: z.string().describe('Last update timestamp in UTC.'),
        attachments: z.array(z.unknown()).describe('Attachments included in the forward.'),
        cloud_files: z.array(z.unknown()).describe('Cloud files attached to the forward.'),
        email_failure_count: z.number().optional().describe('Number of email delivery failures.'),
        outgoing_failures: z.unknown().optional().describe('Details of outgoing email failures.'),
        last_edited_at: z.string().optional().describe('Timestamp of the last edit.'),
        last_edited_user_id: z.number().optional().describe('ID of the user who last edited the conversation.')
    })
    .describe('Output of a forwarded Freshdesk ticket.');

/**
 * @tags: [write]
 * @tagReason: Creates a forward conversation on the provider and sends an external email.
 * @pitfalls: body must be HTML. The created forward note is private by default, and quoted text and original attachments are included unless explicitly disabled.
 */
const action = createAction({
    description: 'Forward a Freshdesk ticket to one or more email addresses.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://developers.freshdesk.com/api/#forward_tickets
            endpoint: `/api/v2/tickets/${encodeURIComponent(input.ticket_id)}/forward`,
            data: {
                body: input.body,
                to_emails: input.to_emails,
                ...(input.body_text !== undefined && { body_text: input.body_text }),
                ...(input.cc_emails !== undefined && { cc_emails: input.cc_emails }),
                ...(input.bcc_emails !== undefined && { bcc_emails: input.bcc_emails }),
                ...(input.from_email !== undefined && { from_email: input.from_email }),
                ...(input.include_quoted_text !== undefined && { include_quoted_text: input.include_quoted_text }),
                ...(input.include_original_attachments !== undefined && { include_original_attachments: input.include_original_attachments }),
                ...(input.private !== undefined && { private: input.private }),
                ...(input.agent_id !== undefined && { agent_id: input.agent_id })
            },
            retries: 1
        };

        const response = await nango.post(config);

        const providerConversation = ProviderConversationSchema.parse(response.data);

        return {
            id: providerConversation.id,
            ticket_id: providerConversation.ticket_id,
            body: providerConversation.body,
            body_text: providerConversation.body_text,
            to_emails: providerConversation.to_emails,
            from_email: providerConversation.from_email,
            cc_emails: providerConversation.cc_emails,
            bcc_emails: providerConversation.bcc_emails,
            user_id: providerConversation.user_id,
            ...(providerConversation.support_email != null && { support_email: providerConversation.support_email }),
            source: providerConversation.source,
            category: providerConversation.category,
            incoming: providerConversation.incoming,
            private: providerConversation.private,
            has_quoted_text: providerConversation.has_quoted_text,
            deleted: providerConversation.deleted,
            created_at: providerConversation.created_at,
            updated_at: providerConversation.updated_at,
            attachments: providerConversation.attachments,
            cloud_files: providerConversation.cloud_files,
            ...(providerConversation.email_failure_count != null && { email_failure_count: providerConversation.email_failure_count }),
            ...(providerConversation.outgoing_failures != null && { outgoing_failures: providerConversation.outgoing_failures }),
            ...(providerConversation.last_edited_at != null && { last_edited_at: providerConversation.last_edited_at }),
            ...(providerConversation.last_edited_user_id != null && { last_edited_user_id: providerConversation.last_edited_user_id })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
