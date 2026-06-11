import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    accountId: z.string().describe('Zoho Mail account ID. Example: "4845214000000008002"'),
    folderId: z.string().describe('Folder ID to list messages from. Example: "4845214000000008008"'),
    limit: z.number().min(1).max(200).optional().describe('Number of messages to retrieve. Max 200. Default 10.'),
    start: z.number().min(1).optional().describe('Starting sequence number. Default 1.'),
    sortorder: z.number().optional().describe('Sort order: 0 for ascending, 1 for descending. Default 1.')
});

const ProviderMessageSchema = z.object({
    summary: z.string().optional(),
    sentDateInGMT: z.string().optional(),
    calendarType: z.number().optional(),
    subject: z.string().optional(),
    messageId: z.string(),
    threadCount: z.string().optional(),
    flagid: z.string().optional(),
    status2: z.string().optional(),
    priority: z.string().optional(),
    hasInline: z.string().optional(),
    toAddress: z.string().optional(),
    folderId: z.string().optional(),
    ccAddress: z.string().optional(),
    threadId: z.string().optional(),
    hasAttachment: z.string().optional(),
    size: z.string().optional(),
    sender: z.string().optional(),
    receivedTime: z.string().optional(),
    fromAddress: z.string().optional(),
    status: z.string().optional()
});

const ProviderResponseSchema = z.object({
    status: z
        .object({
            code: z.number(),
            description: z.string().optional()
        })
        .optional(),
    data: z.array(z.unknown())
});

const MessageSchema = z.object({
    messageId: z.string(),
    subject: z.string().optional(),
    summary: z.string().optional(),
    fromAddress: z.string().optional(),
    toAddress: z.string().optional(),
    ccAddress: z.string().optional(),
    sender: z.string().optional(),
    receivedTime: z.string().optional(),
    sentDateInGMT: z.string().optional(),
    folderId: z.string().optional(),
    threadId: z.string().optional(),
    threadCount: z.string().optional(),
    hasAttachment: z.string().optional(),
    hasInline: z.string().optional(),
    size: z.string().optional(),
    priority: z.string().optional(),
    status: z.string().optional(),
    status2: z.string().optional(),
    flagid: z.string().optional(),
    calendarType: z.number().optional()
});

const OutputSchema = z.object({
    messages: z.array(MessageSchema),
    nextCursor: z.string().optional()
});

const action = createAction({
    description: 'List messages in a folder in Zoho Mail.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/list-messages',
        group: 'Messages'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ZohoMail.messages.READ'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const params: Record<string, string | number> = {
            folderId: input.folderId
        };

        if (input.limit !== undefined) {
            params['limit'] = input.limit;
        }

        if (input.start !== undefined) {
            params['start'] = input.start;
        }

        if (input.sortorder !== undefined) {
            if (input.sortorder !== 0 && input.sortorder !== 1) {
                throw new nango.ActionError({
                    type: 'invalid_input',
                    message: 'sortorder must be 0 (ascending) or 1 (descending).'
                });
            }
            params['sortorder'] = input.sortorder === 1 ? 'true' : 'false';
        }

        const response = await nango.get({
            // https://www.zoho.com/mail/help/api/get-emails-list.html
            endpoint: `/api/accounts/${encodeURIComponent(input.accountId)}/messages/view`,
            params: params,
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        const messages = providerResponse.data
            .map((item: unknown) => {
                const parsed = ProviderMessageSchema.safeParse(item);
                if (!parsed.success) {
                    return null;
                }
                const msg = parsed.data;
                const mapped = {
                    messageId: msg.messageId,
                    ...(msg.summary !== undefined && { summary: msg.summary }),
                    ...(msg.sentDateInGMT !== undefined && { sentDateInGMT: msg.sentDateInGMT }),
                    ...(msg.calendarType !== undefined && { calendarType: msg.calendarType }),
                    ...(msg.subject !== undefined && { subject: msg.subject }),
                    ...(msg.threadCount !== undefined && { threadCount: msg.threadCount }),
                    ...(msg.flagid !== undefined && { flagid: msg.flagid }),
                    ...(msg.status2 !== undefined && { status2: msg.status2 }),
                    ...(msg.priority !== undefined && { priority: msg.priority }),
                    ...(msg.hasInline !== undefined && { hasInline: msg.hasInline }),
                    ...(msg.toAddress !== undefined && { toAddress: msg.toAddress }),
                    ...(msg.folderId !== undefined && { folderId: msg.folderId }),
                    ...(msg.ccAddress !== undefined && { ccAddress: msg.ccAddress }),
                    ...(msg.threadId !== undefined && { threadId: msg.threadId }),
                    ...(msg.hasAttachment !== undefined && { hasAttachment: msg.hasAttachment }),
                    ...(msg.size !== undefined && { size: msg.size }),
                    ...(msg.sender !== undefined && { sender: msg.sender }),
                    ...(msg.receivedTime !== undefined && { receivedTime: msg.receivedTime }),
                    ...(msg.fromAddress !== undefined && { fromAddress: msg.fromAddress }),
                    ...(msg.status !== undefined && { status: msg.status })
                };
                return MessageSchema.parse(mapped);
            })
            .filter((item) => item !== null);

        const currentStart = input.start ?? 1;
        const currentLimit = input.limit ?? 10;
        const nextCursor = providerResponse.data.length === currentLimit ? String(currentStart + currentLimit) : undefined;

        return {
            messages: messages,
            ...(nextCursor !== undefined && { nextCursor: nextCursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
