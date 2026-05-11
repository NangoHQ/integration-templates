import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    folderId: z.string().optional().describe('Mail folder ID. Use "inbox" for the inbox folder. Example: "inbox"'),
    filter: z.string().optional().describe('OData filter expression for receivedDateTime. Example: "receivedDateTime ge 2024-01-01T00:00:00Z"'),
    select: z.string().optional().describe('Comma-separated list of properties to include. Example: "id,subject,receivedDateTime,from"'),
    cursor: z.string().optional().describe('Pagination link (odata.nextLink) from the previous response. Omit for the first page.'),
    limit: z.number().int().min(1).max(50).optional().describe('Maximum number of messages to return per page. Default: 10, Max: 50.')
});

const FromSchema = z.object({
    emailAddress: z
        .object({
            name: z.string().optional(),
            address: z.string().optional()
        })
        .optional()
});

const ProviderMessageSchema = z.object({
    id: z.string(),
    subject: z.string().nullable().optional(),
    receivedDateTime: z.string().optional(),
    sentDateTime: z.string().optional(),
    from: FromSchema.optional(),
    toRecipients: z
        .array(
            z.object({
                emailAddress: z
                    .object({
                        name: z.string().optional(),
                        address: z.string().optional()
                    })
                    .optional()
            })
        )
        .optional(),
    isRead: z.boolean().optional(),
    importance: z.string().optional(),
    conversationId: z.string().optional(),
    internetMessageId: z.string().optional(),
    bodyPreview: z.string().optional()
});

const ProviderListResponseSchema = z.object({
    value: z.array(ProviderMessageSchema),
    '@odata.nextLink': z.string().optional()
});

const MessageSchema = z.object({
    id: z.string(),
    subject: z.string().optional(),
    receivedDateTime: z.string().optional(),
    sentDateTime: z.string().optional(),
    from: FromSchema.optional(),
    toRecipients: z
        .array(
            z.object({
                emailAddress: z
                    .object({
                        name: z.string().optional(),
                        address: z.string().optional()
                    })
                    .optional()
            })
        )
        .optional(),
    isRead: z.boolean().optional(),
    importance: z.string().optional(),
    conversationId: z.string().optional(),
    internetMessageId: z.string().optional(),
    bodyPreview: z.string().optional()
});

const OutputSchema = z.object({
    messages: z.array(MessageSchema),
    next_cursor: z.string().optional()
});

const action = createAction({
    description: 'List messages from a mail folder.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/list-messages',
        group: 'Messages'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['Mail.Read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const folderId = input.folderId ?? 'inbox';
        const params: Record<string, string | number> = {};

        if (input.filter) {
            params['$filter'] = input.filter;
        }

        if (input.select) {
            params['$select'] = input.select;
        }

        if (input.limit) {
            params['$top'] = input.limit;
        }

        let response;

        if (input.cursor) {
            // https://learn.microsoft.com/graph/api/message-delta
            response = await nango.get({
                endpoint: input.cursor,
                retries: 3
            });
        } else {
            // https://learn.microsoft.com/graph/api/user-list-messages
            response = await nango.get({
                endpoint: `/v1.0/me/mailFolders/${encodeURIComponent(folderId)}/messages`,
                params,
                retries: 3
            });
        }

        const listData = ProviderListResponseSchema.parse(response.data);

        const messages = listData.value.map((msg) => ({
            id: msg.id,
            ...(msg.subject !== undefined && { subject: msg.subject ?? undefined }),
            ...(msg.receivedDateTime !== undefined && { receivedDateTime: msg.receivedDateTime }),
            ...(msg.sentDateTime !== undefined && { sentDateTime: msg.sentDateTime }),
            ...(msg.from !== undefined && { from: msg.from }),
            ...(msg.toRecipients !== undefined && { toRecipients: msg.toRecipients }),
            ...(msg.isRead !== undefined && { isRead: msg.isRead }),
            ...(msg.importance !== undefined && { importance: msg.importance }),
            ...(msg.conversationId !== undefined && { conversationId: msg.conversationId }),
            ...(msg.internetMessageId !== undefined && { internetMessageId: msg.internetMessageId }),
            ...(msg.bodyPreview !== undefined && { bodyPreview: msg.bodyPreview })
        }));

        return {
            messages,
            ...(listData['@odata.nextLink'] !== undefined && {
                next_cursor: listData['@odata.nextLink']
            })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
