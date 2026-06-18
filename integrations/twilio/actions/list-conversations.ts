import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor (PageToken) from the previous response. Omit for the first page.'),
    page_size: z
        .number()
        .int()
        .min(1)
        .max(100)
        .optional()
        .describe('How many resources to return in each list page. The default is 50, and the maximum is 100.'),
    state: z.enum(['initializing', 'inactive', 'active', 'closed']).optional().describe('State for sorting and filtering list of Conversations.'),
    start_date: z
        .string()
        .optional()
        .describe('Specifies the beginning of the date range for filtering Conversations based on their creation date. ISO8601 format.'),
    end_date: z.string().optional().describe('Defines the end of the date range for filtering conversations by their creation date. ISO8601 format.')
});

const ConversationSchema = z.object({
    sid: z.string(),
    account_sid: z.string(),
    chat_service_sid: z.string().optional().nullable(),
    messaging_service_sid: z.string().optional().nullable(),
    friendly_name: z.string().optional().nullable(),
    unique_name: z.string().optional().nullable(),
    attributes: z.string().optional().nullable(),
    date_created: z.string().optional(),
    date_updated: z.string().optional(),
    state: z.enum(['initializing', 'inactive', 'active', 'closed']).optional(),
    timers: z
        .object({
            date_inactive: z.string().optional().nullable(),
            date_closed: z.string().optional().nullable()
        })
        .optional()
        .nullable(),
    bindings: z.record(z.string(), z.unknown()).optional().nullable(),
    url: z.string().optional(),
    links: z.record(z.string(), z.string()).optional().nullable()
});

const OutputSchema = z.object({
    items: z.array(ConversationSchema),
    next_page_token: z.string().optional().describe('Pagination cursor for the next page. Omit if absent.')
});

const action = createAction({
    description: 'List conversations from Twilio.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://www.twilio.com/docs/conversations/api/conversation-resource#read-multiple-conversation-resources
            endpoint: '/v1/Conversations',
            baseUrlOverride: 'https://conversations.twilio.com',
            params: {
                ...(input.cursor && { PageToken: input.cursor }),
                ...(input.page_size !== undefined && { PageSize: input.page_size }),
                ...(input.state !== undefined && { State: input.state }),
                ...(input.start_date !== undefined && { StartDate: input.start_date }),
                ...(input.end_date !== undefined && { EndDate: input.end_date })
            },
            retries: 3
        });

        const responseSchema = z.object({
            conversations: z.array(z.unknown()),
            meta: z.unknown().optional()
        });

        const metaSchema = z.object({
            next_page_url: z.string().nullable().optional()
        });

        const parsedResponse = responseSchema.parse(response.data);

        const conversations = parsedResponse.conversations.map((item) => {
            const conversation = ConversationSchema.parse(item);
            return {
                sid: conversation.sid,
                account_sid: conversation.account_sid,
                chat_service_sid: conversation.chat_service_sid,
                messaging_service_sid: conversation.messaging_service_sid,
                friendly_name: conversation.friendly_name,
                unique_name: conversation.unique_name,
                attributes: conversation.attributes,
                date_created: conversation.date_created,
                date_updated: conversation.date_updated,
                state: conversation.state,
                timers: conversation.timers,
                bindings: conversation.bindings,
                url: conversation.url,
                links: conversation.links
            };
        });

        let next_page_token: string | undefined;
        if (parsedResponse.meta && typeof parsedResponse.meta === 'object') {
            const meta = metaSchema.parse(parsedResponse.meta);
            if (meta.next_page_url) {
                const nextUrl = new URL(meta.next_page_url);
                const token = nextUrl.searchParams.get('PageToken');
                if (token) {
                    next_page_token = token;
                }
            }
        }

        return {
            items: conversations,
            ...(next_page_token !== undefined && { next_page_token })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
