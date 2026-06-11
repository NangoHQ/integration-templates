import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const InputSchema = z.object({
    conversation_sid: z.string().describe('The unique ID of the Conversation. Example: "CHXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"'),
    cursor: z.string().optional().describe('Pagination cursor (PageToken) from the previous response. Omit for the first page.'),
    page_size: z
        .number()
        .int()
        .min(1)
        .max(100)
        .optional()
        .describe('How many resources to return in each list page. The default is 50, and the maximum is 100.')
});

const MessagingBindingSchema = z
    .object({
        type: z.string().optional(),
        address: z.string().optional(),
        proxy_address: z.string().optional(),
        projected_address: z.string().optional()
    })
    .optional();

const ParticipantSchema = z.object({
    account_sid: z.string(),
    conversation_sid: z.string(),
    sid: z.string(),
    identity: z.string().optional(),
    attributes: z.string().optional(),
    messaging_binding: MessagingBindingSchema,
    role_sid: z.string().optional(),
    date_created: z.string().optional(),
    date_updated: z.string().optional(),
    url: z.string().optional(),
    last_read_message_index: z.number().optional(),
    last_read_timestamp: z.string().optional()
});

const OutputSchema = z.object({
    items: z.array(ParticipantSchema),
    next_page_token: z.string().optional()
});

const RawMessagingBindingSchema = z
    .object({
        type: z.string().optional(),
        address: z.string().optional(),
        proxy_address: z.string().optional(),
        projected_address: z.string().optional()
    })
    .optional();

const RawParticipantSchema = z.object({
    account_sid: z.string().optional(),
    conversation_sid: z.string().optional(),
    sid: z.string().optional(),
    identity: z.string().optional().nullable(),
    attributes: z.string().optional().nullable(),
    messaging_binding: RawMessagingBindingSchema.nullable().optional(),
    role_sid: z.string().optional().nullable(),
    date_created: z.string().optional().nullable(),
    date_updated: z.string().optional().nullable(),
    url: z.string().optional().nullable(),
    last_read_message_index: z.number().optional().nullable(),
    last_read_timestamp: z.string().optional().nullable()
});

const RawMetaSchema = z.object({
    page: z.number().optional(),
    page_size: z.number().optional(),
    first_page_url: z.string().optional().nullable(),
    previous_page_url: z.string().optional().nullable(),
    url: z.string().optional().nullable(),
    next_page_url: z.string().optional().nullable(),
    key: z.string().optional()
});

const RawResponseSchema = z.object({
    participants: z.array(RawParticipantSchema).optional(),
    meta: RawMetaSchema.optional()
});

const action = createAction({
    description: 'List participants in a Twilio conversation.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/list-participants',
        group: 'Conversations'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const params: Record<string, string> = {};
        if (input.cursor) {
            params['PageToken'] = input.cursor;
        }
        if (input.page_size !== undefined) {
            params['PageSize'] = String(input.page_size);
        }

        const config: ProxyConfiguration = {
            // https://www.twilio.com/docs/conversations/api/conversation-participant-resource#read-multiple-conversationparticipant-resources
            endpoint: `/v1/Conversations/${encodeURIComponent(input.conversation_sid)}/Participants`,
            baseUrlOverride: 'https://conversations.twilio.com',
            params,
            retries: 3
        };

        const response = await nango.get(config);
        const raw = RawResponseSchema.parse(response.data);
        const participants = raw.participants || [];

        let nextPageToken: string | undefined;
        const nextPageUrl = raw.meta?.next_page_url;
        if (typeof nextPageUrl === 'string') {
            const urlObj = new URL(nextPageUrl);
            const token = urlObj.searchParams.get('PageToken');
            if (token) {
                nextPageToken = token;
            }
        }

        const items = participants.map((p) => {
            if (!p.account_sid || !p.conversation_sid || !p.sid) {
                throw new Error(
                    `Participant record missing required fields: ${JSON.stringify({ account_sid: p.account_sid, conversation_sid: p.conversation_sid, sid: p.sid })}`
                );
            }
            return {
                account_sid: p.account_sid,
                conversation_sid: p.conversation_sid,
                sid: p.sid,
                ...(p.identity != null && { identity: p.identity }),
                ...(p.attributes != null && { attributes: p.attributes }),
                ...(p.messaging_binding != null && {
                    messaging_binding: {
                        ...(p.messaging_binding.type != null && { type: p.messaging_binding.type }),
                        ...(p.messaging_binding.address != null && { address: p.messaging_binding.address }),
                        ...(p.messaging_binding.proxy_address != null && { proxy_address: p.messaging_binding.proxy_address }),
                        ...(p.messaging_binding.projected_address != null && { projected_address: p.messaging_binding.projected_address })
                    }
                }),
                ...(p.role_sid != null && { role_sid: p.role_sid }),
                ...(p.date_created != null && { date_created: p.date_created }),
                ...(p.date_updated != null && { date_updated: p.date_updated }),
                ...(p.url != null && { url: p.url }),
                ...(p.last_read_message_index != null && { last_read_message_index: p.last_read_message_index }),
                ...(p.last_read_timestamp != null && { last_read_timestamp: p.last_read_timestamp })
            };
        });

        return {
            items,
            ...(nextPageToken != null && { next_page_token: nextPageToken })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
