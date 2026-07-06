import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    reply_to_uuid: z.string().describe('The UUID of the existing email to reply to. Example: "019f1a8f-9da9-70c2-b20b-440cffc77ef6"'),
    eaccount: z.string().describe('The sending account email address connected to the workspace. Example: "sender@example.com"'),
    subject: z.string().describe('Subject line of the reply email. Example: "Re: Your inquiry"'),
    body: z.string().describe('Plain text body of the reply email. Example: "Hello, how are you?"'),
    html_body: z.string().optional().describe('Optional HTML body of the reply email. Example: "<p>Hello, how are you?</p>"'),
    additional_recipients: z.array(z.string().email()).optional().describe('Optional extra recipient email addresses to include in the reply.'),
    cc_address_email_list: z.string().optional().describe('Comma-separated list of CC email addresses. Example: "cc@example.com"'),
    bcc_address_email_list: z.string().optional().describe('Comma-separated list of BCC email addresses. Example: "bcc@example.com"'),
    reminder_ts: z.string().optional().describe('Optional ISO 8601 timestamp to attach a reminder to this email. Example: "2026-06-30T21:38:08.051Z"'),
    assigned_to: z.string().optional().describe('Optional user UUID assigned to the lead. Example: "019f1a77-d233-70e8-865a-19fc267e9150"')
});

const ProviderEmailSchema = z.object({
    id: z.string(),
    timestamp_created: z.string(),
    timestamp_email: z.string().optional(),
    message_id: z.string().optional(),
    subject: z.string(),
    from_address_email: z.string().nullable().optional(),
    to_address_email_list: z.string(),
    cc_address_email_list: z.string().nullable().optional(),
    bcc_address_email_list: z.string().nullable().optional(),
    reply_to: z.string().nullable().optional(),
    body: z.object({
        text: z.string().optional(),
        html: z.string().optional()
    }),
    organization_id: z.string(),
    campaign_id: z.string().nullable().optional(),
    subsequence_id: z.string().nullable().optional(),
    list_id: z.string().nullable().optional(),
    lead: z.string().nullable().optional(),
    lead_id: z.string().nullable().optional(),
    eaccount: z.string(),
    ue_type: z.number().nullable().optional(),
    step: z.string().nullable().optional(),
    is_unread: z.number().nullable().optional(),
    is_auto_reply: z.number().nullable().optional(),
    reminder_ts: z.string().nullable().optional(),
    ai_interest_value: z.number().nullable().optional(),
    ai_assisted: z.number().nullable().optional(),
    is_focused: z.number().nullable().optional(),
    i_status: z.number().nullable().optional(),
    thread_id: z.string().nullable().optional(),
    content_preview: z.string().nullable().optional(),
    ai_agent_id: z.string().nullable().optional()
});

const OutputSchema = z.object({
    id: z.string(),
    timestamp_created: z.string(),
    subject: z.string(),
    from_address_email: z.string().optional(),
    to_address_email_list: z.string(),
    cc_address_email_list: z.string().optional(),
    bcc_address_email_list: z.string().optional(),
    reply_to: z.string().optional(),
    body: z.object({
        text: z.string().optional(),
        html: z.string().optional()
    }),
    organization_id: z.string(),
    campaign_id: z.string().optional(),
    subsequence_id: z.string().optional(),
    list_id: z.string().optional(),
    lead: z.string().optional(),
    lead_id: z.string().optional(),
    eaccount: z.string(),
    ue_type: z.number().optional(),
    step: z.string().optional(),
    is_unread: z.number().optional(),
    is_auto_reply: z.number().optional(),
    reminder_ts: z.string().optional(),
    ai_interest_value: z.number().optional(),
    ai_assisted: z.number().optional(),
    is_focused: z.number().optional(),
    i_status: z.number().optional(),
    thread_id: z.string().optional(),
    content_preview: z.string().optional(),
    ai_agent_id: z.string().optional()
});

const action = createAction({
    description: 'Reply to an email.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['emails:create'],
    endpoint: {
        method: 'POST',
        path: '/actions/reply-to-email'
    },

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const requestBody: Record<string, unknown> = {
            reply_to_uuid: input.reply_to_uuid,
            eaccount: input.eaccount,
            subject: input.subject,
            body: {
                text: input.body,
                ...(input.html_body !== undefined && { html: input.html_body })
            }
        };

        if (input.additional_recipients !== undefined) {
            requestBody['additional_recipients'] = input.additional_recipients;
        }
        if (input.cc_address_email_list !== undefined) {
            requestBody['cc_address_email_list'] = input.cc_address_email_list;
        }
        if (input.bcc_address_email_list !== undefined) {
            requestBody['bcc_address_email_list'] = input.bcc_address_email_list;
        }
        if (input.reminder_ts !== undefined) {
            requestBody['reminder_ts'] = input.reminder_ts;
        }
        if (input.assigned_to !== undefined) {
            requestBody['assigned_to'] = input.assigned_to;
        }

        // https://developer.instantly.ai/api-reference/email/reply-to-an-email.md
        const response = await nango.post({
            endpoint: '/v2/emails/reply',
            data: requestBody,
            retries: 3
        });

        const providerEmail = ProviderEmailSchema.parse(response.data);

        return {
            id: providerEmail.id,
            timestamp_created: providerEmail.timestamp_created,
            subject: providerEmail.subject,
            ...(providerEmail.from_address_email != null && { from_address_email: providerEmail.from_address_email }),
            to_address_email_list: providerEmail.to_address_email_list,
            ...(providerEmail.cc_address_email_list != null && { cc_address_email_list: providerEmail.cc_address_email_list }),
            ...(providerEmail.bcc_address_email_list != null && { bcc_address_email_list: providerEmail.bcc_address_email_list }),
            ...(providerEmail.reply_to != null && { reply_to: providerEmail.reply_to }),
            body: providerEmail.body,
            organization_id: providerEmail.organization_id,
            ...(providerEmail.campaign_id != null && { campaign_id: providerEmail.campaign_id }),
            ...(providerEmail.subsequence_id != null && { subsequence_id: providerEmail.subsequence_id }),
            ...(providerEmail.list_id != null && { list_id: providerEmail.list_id }),
            ...(providerEmail.lead != null && { lead: providerEmail.lead }),
            ...(providerEmail.lead_id != null && { lead_id: providerEmail.lead_id }),
            eaccount: providerEmail.eaccount,
            ...(providerEmail.ue_type != null && { ue_type: providerEmail.ue_type }),
            ...(providerEmail.step != null && { step: providerEmail.step }),
            ...(providerEmail.is_unread != null && { is_unread: providerEmail.is_unread }),
            ...(providerEmail.is_auto_reply != null && { is_auto_reply: providerEmail.is_auto_reply }),
            ...(providerEmail.reminder_ts != null && { reminder_ts: providerEmail.reminder_ts }),
            ...(providerEmail.ai_interest_value != null && { ai_interest_value: providerEmail.ai_interest_value }),
            ...(providerEmail.ai_assisted != null && { ai_assisted: providerEmail.ai_assisted }),
            ...(providerEmail.is_focused != null && { is_focused: providerEmail.is_focused }),
            ...(providerEmail.i_status != null && { i_status: providerEmail.i_status }),
            ...(providerEmail.thread_id != null && { thread_id: providerEmail.thread_id }),
            ...(providerEmail.content_preview != null && { content_preview: providerEmail.content_preview }),
            ...(providerEmail.ai_agent_id != null && { ai_agent_id: providerEmail.ai_agent_id })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
