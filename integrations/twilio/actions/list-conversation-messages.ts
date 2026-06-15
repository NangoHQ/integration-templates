import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    conversation_sid: z.string().describe('The SID of the conversation. Example: CH7455d9a8e3c541da993a275b699d6c83'),
    page_size: z.number().optional().describe('Maximum number of messages to return per page. Default 50, max 100.'),
    order: z.enum(['asc', 'desc']).optional().describe('Sort order for messages. Default asc.'),
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.')
});

const MessageSchema = z
    .object({
        sid: z.string(),
        account_sid: z.string(),
        conversation_sid: z.string(),
        body: z.string().nullable().optional(),
        author: z.string().nullable().optional(),
        attributes: z.string().nullable().optional(),
        date_created: z.string().nullable().optional(),
        date_updated: z.string().nullable().optional(),
        index: z.number().nullable().optional(),
        participant_sid: z.string().nullable().optional(),
        media: z.array(z.unknown()).nullable().optional(),
        url: z.string().nullable().optional()
    })
    .passthrough();

const OutputSchema = z.object({
    messages: z.array(MessageSchema),
    next_page: z.string().optional()
});

const action = createAction({
    description: 'List messages in a Twilio conversation.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/list-conversation-messages',
        group: 'Conversations'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const conversationSid = encodeURIComponent(input.conversation_sid);

        const response = await nango.get({
            // https://www.twilio.com/docs/conversations/api/conversation-message-resource
            endpoint: `/v1/Conversations/${conversationSid}/Messages`,
            params: {
                ...(input.page_size !== undefined && { PageSize: input.page_size }),
                ...(input.cursor !== undefined && { PageToken: input.cursor }),
                ...(input.order !== undefined && { Order: input.order })
            },
            retries: 3,
            baseUrlOverride: 'https://conversations.twilio.com'
        });

        const providerResponse = z
            .object({
                messages: z.array(z.unknown()),
                meta: z
                    .object({
                        next_page_url: z.string().nullable().optional(),
                        page: z.number().optional(),
                        page_size: z.number().optional()
                    })
                    .optional()
            })
            .parse(response.data);

        const messages = providerResponse.messages.map((message) => {
            return MessageSchema.parse(message);
        });

        let nextPage: string | undefined;
        if (providerResponse.meta?.next_page_url) {
            const url = new URL(providerResponse.meta.next_page_url);
            const pageToken = url.searchParams.get('PageToken');
            const pageNum = url.searchParams.get('Page');
            if (pageToken) {
                nextPage = pageToken;
            } else if (pageNum) {
                nextPage = pageNum;
            }
        }

        return {
            messages,
            ...(nextPage !== undefined && { next_page: nextPage })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
