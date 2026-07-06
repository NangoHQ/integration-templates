import { z } from 'zod';
import { createAction, ProxyConfiguration } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('The email ID to patch. Example: "019f1a8f-9da9-70c2-b20b-440cffc77ef6"'),
    is_unread: z.number().nullable().optional().describe('Indicates if the email is unread. Set to 1 for unread, 0 for read.'),
    reminder_ts: z.string().nullable().optional().describe('Timestamp for the reminder. Example: "2026-06-30T21:37:58.976Z"')
});

const AttachmentFileSchema = z.object({
    filename: z.string(),
    size: z.number().optional(),
    type: z.string().optional(),
    url: z.string().optional(),
    error: z.string().nullable().optional()
});

const AttachmentJsonSchema = z.object({
    files: z.array(AttachmentFileSchema)
});

const ProviderEmailSchema = z.object({
    id: z.string(),
    timestamp_created: z.string(),
    timestamp_email: z.string(),
    message_id: z.string(),
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
    attachment_json: AttachmentJsonSchema.nullable().optional(),
    from_address_json: z.array(z.record(z.string(), z.unknown())).nullable().optional(),
    to_address_json: z.array(z.record(z.string(), z.unknown())).nullable().optional(),
    cc_address_json: z.array(z.record(z.string(), z.unknown())).nullable().optional(),
    ai_agent_id: z.string().nullable().optional()
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
    body: z
        .object({
            text: z.string().optional(),
            html: z.string().optional()
        })
        .optional(),
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
    attachment_json: AttachmentJsonSchema.optional(),
    from_address_json: z.array(z.record(z.string(), z.unknown())).optional(),
    to_address_json: z.array(z.record(z.string(), z.unknown())).optional(),
    cc_address_json: z.array(z.record(z.string(), z.unknown())).optional(),
    ai_agent_id: z.string().optional()
});

function present<T>(value: T | null | undefined): value is T {
    return value !== null && value !== undefined;
}

function mapEmail(email: z.infer<typeof ProviderEmailSchema>): z.infer<typeof OutputSchema> {
    return {
        id: email.id,
        ...(present(email.timestamp_created) && { timestamp_created: email.timestamp_created }),
        ...(present(email.timestamp_email) && { timestamp_email: email.timestamp_email }),
        ...(present(email.message_id) && { message_id: email.message_id }),
        ...(present(email.subject) && { subject: email.subject }),
        ...(present(email.from_address_email) && { from_address_email: email.from_address_email }),
        ...(present(email.to_address_email_list) && { to_address_email_list: email.to_address_email_list }),
        ...(present(email.cc_address_email_list) && { cc_address_email_list: email.cc_address_email_list }),
        ...(present(email.bcc_address_email_list) && { bcc_address_email_list: email.bcc_address_email_list }),
        ...(present(email.reply_to) && { reply_to: email.reply_to }),
        ...(present(email.body) && { body: email.body }),
        ...(present(email.organization_id) && { organization_id: email.organization_id }),
        ...(present(email.campaign_id) && { campaign_id: email.campaign_id }),
        ...(present(email.subsequence_id) && { subsequence_id: email.subsequence_id }),
        ...(present(email.list_id) && { list_id: email.list_id }),
        ...(present(email.lead) && { lead: email.lead }),
        ...(present(email.lead_id) && { lead_id: email.lead_id }),
        ...(present(email.eaccount) && { eaccount: email.eaccount }),
        ...(present(email.ue_type) && { ue_type: email.ue_type }),
        ...(present(email.step) && { step: email.step }),
        ...(present(email.is_unread) && { is_unread: email.is_unread }),
        ...(present(email.is_auto_reply) && { is_auto_reply: email.is_auto_reply }),
        ...(present(email.reminder_ts) && { reminder_ts: email.reminder_ts }),
        ...(present(email.ai_interest_value) && { ai_interest_value: email.ai_interest_value }),
        ...(present(email.ai_assisted) && { ai_assisted: email.ai_assisted }),
        ...(present(email.is_focused) && { is_focused: email.is_focused }),
        ...(present(email.i_status) && { i_status: email.i_status }),
        ...(present(email.thread_id) && { thread_id: email.thread_id }),
        ...(present(email.content_preview) && { content_preview: email.content_preview }),
        ...(present(email.attachment_json) && { attachment_json: email.attachment_json }),
        ...(present(email.from_address_json) && { from_address_json: email.from_address_json }),
        ...(present(email.to_address_json) && { to_address_json: email.to_address_json }),
        ...(present(email.cc_address_json) && { cc_address_json: email.cc_address_json }),
        ...(present(email.ai_agent_id) && { ai_agent_id: email.ai_agent_id })
    };
}

const action = createAction({
    description: 'Patch an email.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['emails:update'],
    endpoint: {
        method: 'POST',
        path: '/actions/patch-email'
    },

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        if (input.is_unread === undefined && input.reminder_ts === undefined) {
            throw new nango.ActionError({
                type: 'invalid_input',
                message: 'At least one of is_unread or reminder_ts must be provided.'
            });
        }

        const patchData: { is_unread?: number | null; reminder_ts?: string | null } = {};
        if (input.is_unread !== undefined) {
            patchData.is_unread = input.is_unread;
        }
        if (input.reminder_ts !== undefined) {
            patchData.reminder_ts = input.reminder_ts;
        }

        const config: ProxyConfiguration = {
            // https://developer.instantly.ai/api-reference/email/patch-email
            endpoint: `/v2/emails/${encodeURIComponent(input.id)}`,
            data: patchData,
            retries: 10
        };

        const response = await nango.patch(config);
        const providerEmail = ProviderEmailSchema.parse(response.data);
        return mapEmail(providerEmail);
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
