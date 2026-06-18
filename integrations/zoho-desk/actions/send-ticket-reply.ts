import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    ticket_id: z.string().describe('The ticket ID to reply to. Example: "1892000000094004"'),
    content: z.string().describe('Content of the reply. Example: "We have identified the root cause and fixed it."'),
    channel: z.string().optional().describe('Channel through which the thread originated. Values: EMAIL, FACEBOOK, TWITTER, FORUMS. Default: EMAIL'),
    contentType: z.string().optional().describe('Formatting type of the content. Values: html, plainText. Default: plainText'),
    fromEmailAddress: z.string().optional().describe('From email address configured in the help desk portal. Example: "support@zylker.com"'),
    to: z.string().optional().describe('To email address for the reply. Example: "customer@example.com"'),
    cc: z.string().optional().describe('Email addresses to CC. Comma-separated for multiple values.'),
    bcc: z.string().optional().describe('Email addresses to BCC. Comma-separated for multiple values.'),
    isPrivate: z.boolean().optional().describe('Whether the thread is private. Default: false'),
    isForward: z.boolean().optional().describe('Whether the thread is sent as a forward. Default: false'),
    inReplyToThreadId: z.string().optional().describe('ID of the thread to which this reply is a response.'),
    attachmentIds: z.array(z.string()).optional().describe('List of attachment IDs to include in the reply.'),
    ticketStatus: z.string().optional().describe('Ticket status to set after sending the reply. Example: "Closed"')
});

const AttachmentSchema = z.object({
    size: z.string().optional(),
    name: z.string().optional(),
    id: z.string(),
    href: z.string().optional()
});

const AuthorSchema = z.object({
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    photoURL: z.string().optional(),
    name: z.string().optional(),
    type: z.string().optional(),
    email: z.string().optional()
});

const SourceSchema = z.object({
    appName: z.string().nullable().optional(),
    extId: z.string().nullable().optional(),
    type: z.string().optional(),
    permalink: z.string().nullable().optional(),
    appPhotoURL: z.string().nullable().optional()
});

const OutputSchema = z.object({
    id: z.string().describe('The thread ID of the reply.'),
    summary: z.string().optional(),
    cc: z.string().optional(),
    bcc: z.string().optional(),
    isDescriptionThread: z.boolean().optional(),
    attachments: z.array(AttachmentSchema).optional(),
    canReply: z.boolean().optional(),
    visibility: z.string().optional(),
    author: AuthorSchema.optional(),
    channel: z.string().optional(),
    source: SourceSchema.optional(),
    content: z.string().optional(),
    isForward: z.boolean().optional(),
    hasAttach: z.boolean().optional(),
    responderId: z.string().optional(),
    channelRelatedInfo: z.unknown().nullable().optional(),
    respondedIn: z.string().optional(),
    createdTime: z.string().optional(),
    to: z.string().optional(),
    fromEmailAddress: z.string().optional(),
    actions: z.array(z.unknown()).optional(),
    contentType: z.string().optional(),
    status: z.string().optional(),
    direction: z.string().optional()
});

const action = createAction({
    description: 'Send a ticket reply.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['Desk.tickets.UPDATE'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const connection = await nango.getConnection();
        const extension = connection.connection_config?.['extension'];
        const baseUrlOverride = typeof extension === 'string' ? `https://desk.zoho.${extension}` : 'https://desk.zoho.com';

        const data: Record<string, unknown> = {
            content: input.content
        };

        if (input.channel !== undefined) {
            data['channel'] = input.channel;
        }
        if (input.contentType !== undefined) {
            data['contentType'] = input.contentType;
        }
        if (input.fromEmailAddress !== undefined) {
            data['fromEmailAddress'] = input.fromEmailAddress;
        }
        if (input.to !== undefined) {
            data['to'] = input.to;
        }
        if (input.cc !== undefined) {
            data['cc'] = input.cc;
        }
        if (input.bcc !== undefined) {
            data['bcc'] = input.bcc;
        }
        if (input.isPrivate !== undefined) {
            data['isPrivate'] = input.isPrivate;
        }
        if (input.isForward !== undefined) {
            data['isForward'] = input.isForward;
        }
        if (input.inReplyToThreadId !== undefined) {
            data['inReplyToThreadId'] = input.inReplyToThreadId;
        }
        if (input.attachmentIds !== undefined) {
            data['attachmentIds'] = input.attachmentIds;
        }
        if (input.ticketStatus !== undefined) {
            data['ticketStatus'] = input.ticketStatus;
        }

        const response = await nango.post({
            // https://desk.zoho.com/DeskAPIDocument#Threads_SendEmailReply
            endpoint: `/api/v1/tickets/${encodeURIComponent(input.ticket_id)}/sendReply`,
            data,
            retries: 1,
            baseUrlOverride
        });

        const parsed = OutputSchema.parse(response.data);
        return parsed;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
