// Generated by ts-to-zod
import { z } from 'zod';

export const zendeskArticleSchema = z.object({
    title: z.string(),
    locale: z.string(),
    user_segment_id: z.number(),
    permission_group_id: z.number(),
    author_id: z.number(),
    body: z.string(),
    comments_disabled: z.boolean(),
    content_tag_ids: z.array(z.string()),
    created_at: z.string(),
    draft: z.boolean(),
    edited_at: z.string(),
    html_url: z.string(),
    id: z.number(),
    label_names: z.array(z.string()),
    outdated: z.boolean(),
    outdated_locales: z.array(z.string()),
    position: z.number(),
    promoted: z.boolean(),
    section_id: z.number(),
    source_locale: z.string(),
    updated_at: z.string(),
    url: z.string(),
    vote_count: z.number(),
    vote_sum: z.number()
});

export const zendeskTicketSchema = z.object({
    requester_id: z.number(),
    allow_attachments: z.boolean(),
    allow_channelback: z.boolean(),
    assignee_email: z.string(),
    assignee_id: z.number(),
    attribute_value_ids: z.array(z.number()),
    brand_id: z.number(),
    collaborator_ids: z.array(z.number()),
    collaborators: z.array(z.any()),
    comment: z.record(z.any()),
    created_at: z.string(),
    custom_fields: z.array(z.any()),
    custom_status_id: z.number(),
    description: z.string(),
    due_at: z.string(),
    email_cc_ids: z.array(z.number()),
    email_ccs: z.record(z.any()),
    external_id: z.string(),
    follower_ids: z.array(z.number()),
    followers: z.record(z.any()),
    followup_ids: z.array(z.number()),
    forum_topic_id: z.number(),
    from_messaging_channel: z.boolean(),
    group_id: z.number(),
    has_incidents: z.boolean(),
    id: z.number(),
    is_public: z.boolean(),
    macro_id: z.number(),
    macro_ids: z.array(z.number()),
    metadata: z.record(z.any()),
    organization_id: z.number(),
    priority: z.string(),
    problem_id: z.number(),
    raw_subject: z.string(),
    recipient: z.string(),
    requester: z.record(z.any()),
    safe_update: z.boolean(),
    satisfaction_rating: z.object({
        aliqua38: z.number()
    }),
    sharing_agreement_ids: z.array(z.number()),
    status: z.string(),
    subject: z.string(),
    submitter_id: z.number(),
    tags: z.array(z.string()),
    ticket_form_id: z.number(),
    type: z.string(),
    updated_at: z.string(),
    updated_stamp: z.string(),
    url: z.string(),
    via: z.object({
        channel: z.string(),
        source: z.object({
            eu__4: z.number(),
            id__8f: z.string()
        })
    }),
    via_followup_source_id: z.number(),
    via_id: z.number(),
    voice_comment: z.record(z.any())
});