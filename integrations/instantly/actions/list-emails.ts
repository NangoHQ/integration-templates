import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    limit: z.number().int().min(1).max(100).optional().describe('The number of items to return. Max 100.'),
    starting_after: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.'),
    search: z.string().optional().describe('Search query to filter emails. Can be an email address or "thread:<thread_id>".'),
    campaign_id: z.string().optional().describe('Filter emails by campaign ID.'),
    list_id: z.string().optional().describe('Filter emails by lead list ID.'),
    is_unread: z.boolean().optional().describe('Filter by unread emails only.'),
    email_type: z.enum(['received', 'sent', 'manual']).optional().describe('Filter by email type.'),
    lead: z.string().optional().describe('Filter by lead email address.'),
    eaccount: z.string().optional().describe('Filter by sending account email address.'),
    mode: z.enum(['emode_focused', 'emode_others', 'emode_all']).optional().describe('Filter by Unibox mode.'),
    sort_order: z.enum(['asc', 'desc']).optional().describe('Sort order by creation date. Default is desc.'),
    min_timestamp_created: z.string().optional().describe('Filter emails created after this ISO timestamp.'),
    max_timestamp_created: z.string().optional().describe('Filter emails created before this ISO timestamp.'),
    latest_of_thread: z.boolean().optional().describe('Return only the latest email in each thread.')
});

const EmailAttachmentSchema = z.object({
    filename: z.string(),
    size: z.number().optional(),
    type: z.string().optional(),
    url: z.string().optional(),
    error: z.string().nullish()
});

const EmailBodySchema = z.object({
    text: z.string().optional(),
    html: z.string().optional()
});

const EmailSchema = z.object({
    id: z.string(),
    timestamp_created: z.string(),
    timestamp_email: z.string(),
    message_id: z.string(),
    subject: z.string(),
    from_address_email: z.string().nullish(),
    to_address_email_list: z.string(),
    cc_address_email_list: z.string().nullish(),
    bcc_address_email_list: z.string().nullish(),
    reply_to: z.string().nullish(),
    body: EmailBodySchema,
    organization_id: z.string(),
    campaign_id: z.string().nullish(),
    subsequence_id: z.string().nullish(),
    list_id: z.string().nullish(),
    lead: z.string().nullish(),
    lead_id: z.string().nullish(),
    eaccount: z.string(),
    ue_type: z.number().nullish(),
    step: z.string().nullish(),
    is_unread: z.number().nullish(),
    is_auto_reply: z.number().nullish(),
    reminder_ts: z.string().nullish(),
    ai_interest_value: z.number().nullish(),
    ai_assisted: z.number().nullish(),
    is_focused: z.number().nullish(),
    i_status: z.number().nullish(),
    thread_id: z.string().nullish(),
    content_preview: z.string().nullish(),
    attachment_json: z
        .object({
            files: z.array(EmailAttachmentSchema)
        })
        .nullish(),
    from_address_json: z.array(z.unknown()).nullish(),
    to_address_json: z.array(z.unknown()).nullish(),
    cc_address_json: z.array(z.unknown()).nullish(),
    ai_agent_id: z.string().nullish()
});

const OutputSchema = z.object({
    items: z.array(EmailSchema),
    next_starting_after: z.string().optional()
});

const action = createAction({
    description: 'List Unibox emails.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['emails:read'],
    endpoint: {
        path: '/actions/list-emails',
        method: 'GET'
    },

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const params: Record<string, string> = {};

        if (input.limit !== undefined) {
            params['limit'] = String(input.limit);
        }

        if (input.starting_after !== undefined) {
            params['starting_after'] = input.starting_after;
        }

        if (input.search !== undefined) {
            params['search'] = input.search;
        }

        if (input.campaign_id !== undefined) {
            params['campaign_id'] = input.campaign_id;
        }

        if (input.list_id !== undefined) {
            params['list_id'] = input.list_id;
        }

        if (input.is_unread !== undefined) {
            params['is_unread'] = String(input.is_unread);
        }

        if (input.email_type !== undefined) {
            params['email_type'] = input.email_type;
        }

        if (input.lead !== undefined) {
            params['lead'] = input.lead;
        }

        if (input.eaccount !== undefined) {
            params['eaccount'] = input.eaccount;
        }

        if (input.mode !== undefined) {
            params['mode'] = input.mode;
        }

        if (input.sort_order !== undefined) {
            params['sort_order'] = input.sort_order;
        }

        if (input.min_timestamp_created !== undefined) {
            params['min_timestamp_created'] = input.min_timestamp_created;
        }

        if (input.max_timestamp_created !== undefined) {
            params['max_timestamp_created'] = input.max_timestamp_created;
        }

        if (input.latest_of_thread !== undefined) {
            params['latest_of_thread'] = String(input.latest_of_thread);
        }

        // https://developer.instantly.ai/api-reference/groups/email
        const response = await nango.get({
            endpoint: '/v2/emails',
            params: params,
            retries: 3
        });

        const listResponseSchema = z.object({
            items: z.array(z.unknown()),
            next_starting_after: z.string().optional()
        });

        const parsed = listResponseSchema.parse(response.data);

        const items = parsed.items.map((item) => {
            return EmailSchema.parse(item);
        });

        return {
            items: items,
            ...(parsed.next_starting_after !== undefined && { next_starting_after: parsed.next_starting_after })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
