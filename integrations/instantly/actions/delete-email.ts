import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('The ID of the email to delete. Example: "019f1a77-d235-7344-8666-d64518b48f8c"')
});

const EmailBodySchema = z.object({
    text: z.string().optional(),
    html: z.string().optional()
});

const ProviderEmailSchema = z.object({
    id: z.string(),
    timestamp_created: z.string(),
    timestamp_email: z.string(),
    message_id: z.string(),
    subject: z.string(),
    from_address_email: z.string().optional(),
    to_address_email_list: z.string(),
    cc_address_email_list: z.string().optional(),
    bcc_address_email_list: z.string().optional(),
    reply_to: z.string().optional(),
    body: EmailBodySchema,
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
    attachment_json: z.unknown().optional(),
    from_address_json: z.unknown().optional(),
    to_address_json: z.unknown().optional(),
    cc_address_json: z.unknown().optional(),
    ai_agent_id: z.string().optional()
});

const OutputSchema = z.object({
    id: z.string(),
    timestamp_created: z.string().optional(),
    timestamp_email: z.string().optional(),
    message_id: z.string().optional(),
    subject: z.string().optional(),
    from_address_email: z.string().optional(),
    to_address_email_list: z.string().optional(),
    cc_address_email_list: z.string().optional(),
    bcc_address_email_list: z.string().optional(),
    reply_to: z.string().optional(),
    body: EmailBodySchema.optional(),
    organization_id: z.string().optional(),
    campaign_id: z.string().optional(),
    subsequence_id: z.string().optional(),
    list_id: z.string().optional(),
    lead: z.string().optional(),
    lead_id: z.string().optional(),
    eaccount: z.string().optional(),
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
    attachment_json: z.unknown().optional(),
    from_address_json: z.unknown().optional(),
    to_address_json: z.unknown().optional(),
    cc_address_json: z.unknown().optional(),
    ai_agent_id: z.string().optional()
});

const action = createAction({
    description: 'Delete an email.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/delete-email'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['emails:delete', 'emails:all', 'all:delete', 'all:all'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.delete({
            // https://developer.instantly.ai/api-reference/email/delete-email
            endpoint: '/v2/emails/' + encodeURIComponent(input.id),
            retries: 10
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Email not found',
                id: input.id
            });
        }

        const providerEmail = ProviderEmailSchema.parse(response.data);

        return {
            id: providerEmail.id,
            ...(providerEmail.timestamp_created != null && { timestamp_created: providerEmail.timestamp_created }),
            ...(providerEmail.timestamp_email != null && { timestamp_email: providerEmail.timestamp_email }),
            ...(providerEmail.message_id != null && { message_id: providerEmail.message_id }),
            ...(providerEmail.subject != null && { subject: providerEmail.subject }),
            ...(providerEmail.from_address_email != null && { from_address_email: providerEmail.from_address_email }),
            ...(providerEmail.to_address_email_list != null && { to_address_email_list: providerEmail.to_address_email_list }),
            ...(providerEmail.cc_address_email_list != null && { cc_address_email_list: providerEmail.cc_address_email_list }),
            ...(providerEmail.bcc_address_email_list != null && { bcc_address_email_list: providerEmail.bcc_address_email_list }),
            ...(providerEmail.reply_to != null && { reply_to: providerEmail.reply_to }),
            ...(providerEmail.body != null && { body: providerEmail.body }),
            ...(providerEmail.organization_id != null && { organization_id: providerEmail.organization_id }),
            ...(providerEmail.campaign_id != null && { campaign_id: providerEmail.campaign_id }),
            ...(providerEmail.subsequence_id != null && { subsequence_id: providerEmail.subsequence_id }),
            ...(providerEmail.list_id != null && { list_id: providerEmail.list_id }),
            ...(providerEmail.lead != null && { lead: providerEmail.lead }),
            ...(providerEmail.lead_id != null && { lead_id: providerEmail.lead_id }),
            ...(providerEmail.eaccount != null && { eaccount: providerEmail.eaccount }),
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
            ...(providerEmail.attachment_json != null && { attachment_json: providerEmail.attachment_json }),
            ...(providerEmail.from_address_json != null && { from_address_json: providerEmail.from_address_json }),
            ...(providerEmail.to_address_json != null && { to_address_json: providerEmail.to_address_json }),
            ...(providerEmail.cc_address_json != null && { cc_address_json: providerEmail.cc_address_json }),
            ...(providerEmail.ai_agent_id != null && { ai_agent_id: providerEmail.ai_agent_id })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
