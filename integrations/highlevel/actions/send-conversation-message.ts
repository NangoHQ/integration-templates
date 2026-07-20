import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    type: z.enum(['SMS', 'RCS', 'Email', 'WhatsApp', 'IG', 'FB', 'Custom', 'Live_Chat', 'TIKTOK']).describe('Type of message being sent. Example: "SMS"'),
    contactId: z.string().describe('ID of the contact receiving the message. Example: "jKy701hlSIPdiw0x12WA"'),
    message: z.string().describe('Text content of the message. Example: "Hello, how can I help you today?"'),
    subType: z.string().optional().describe('Type of message being sent. Defaults to the value of type if not provided. Example: "SMS"'),
    subject: z.string().optional().describe('Subject line for email messages. Example: "Important Update"'),
    html: z.string().optional().describe('HTML content of the message. Example: "<p>Hello World</p>"'),
    emailFrom: z.string().optional().describe('Email address to send from. Example: "sender@company.com"'),
    emailTo: z.string().optional().describe('Email address to send to, if different from contact\'s primary email. Example: "recipient@company.com"'),
    emailCc: z.array(z.string()).optional().describe('Array of CC email addresses.'),
    emailBcc: z.array(z.string()).optional().describe('Array of BCC email addresses.'),
    attachments: z.array(z.string()).optional().describe('Array of attachment URLs.'),
    scheduledTimestamp: z.number().optional().describe('UTC Timestamp (in seconds) at which the message should be scheduled. Example: 1669287863'),
    fromNumber: z.string().optional().describe('Phone number used as the sender number for outbound messages. Example: "+1499499299"'),
    toNumber: z.string().optional().describe('Recipient phone number for outbound messages. Example: "+1439499299"'),
    templateId: z.string().optional().describe('ID of message template. Example: "template123"'),
    replyMessageId: z.string().optional().describe('ID of message being replied to. Example: "msg123"'),
    conversationProviderId: z.string().optional().describe('ID of conversation provider. Example: "provider123"'),
    status: z.enum(['delivered', 'failed', 'pending', 'read']).optional().describe('Message status. Defaults to "pending".')
});

const ProviderResponseSchema = z.object({
    conversationId: z.string(),
    messageId: z.string(),
    emailMessageId: z.string().nullish(),
    messageIds: z.array(z.string()).nullish(),
    msg: z.string().nullish(),
    status: z.string().optional(),
    forwardData: z
        .object({
            forwardWholeThread: z.boolean().nullish(),
            messageId: z.string().nullish(),
            emailMessageId: z.string().nullish(),
            sourceContactId: z.string().nullish(),
            sourceConversationId: z.string().nullish(),
            forwardToEmail: z.string().nullish(),
            recipientContactId: z.string().nullish(),
            recipientConversationId: z.string().nullish()
        })
        .nullish()
});

const OutputSchema = z.object({
    conversationId: z.string(),
    messageId: z.string(),
    emailMessageId: z.string().optional(),
    messageIds: z.array(z.string()).optional(),
    msg: z.string().optional(),
    status: z.string().optional()
});

const action = createAction({
    description: 'Send an SMS, email, or other message through a HighLevel conversation.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['conversations/message.write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://github.com/GoHighLevel/highlevel-api-docs/blob/main/apps/conversations.json
            endpoint: '/conversations/messages',
            headers: {
                Version: '2021-07-28'
            },
            data: {
                type: input.type,
                subType: input.subType ?? input.type,
                contactId: input.contactId,
                status: input.status ?? 'pending',
                message: input.message,
                ...(input.subject !== undefined && { subject: input.subject }),
                ...(input.html !== undefined && { html: input.html }),
                ...(input.emailFrom !== undefined && { emailFrom: input.emailFrom }),
                ...(input.emailTo !== undefined && { emailTo: input.emailTo }),
                ...(input.emailCc !== undefined && { emailCc: input.emailCc }),
                ...(input.emailBcc !== undefined && { emailBcc: input.emailBcc }),
                ...(input.attachments !== undefined && { attachments: input.attachments }),
                ...(input.scheduledTimestamp !== undefined && { scheduledTimestamp: input.scheduledTimestamp }),
                ...(input.fromNumber !== undefined && { fromNumber: input.fromNumber }),
                ...(input.toNumber !== undefined && { toNumber: input.toNumber }),
                ...(input.templateId !== undefined && { templateId: input.templateId }),
                ...(input.replyMessageId !== undefined && { replyMessageId: input.replyMessageId }),
                ...(input.conversationProviderId !== undefined && { conversationProviderId: input.conversationProviderId })
            },
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        return {
            conversationId: providerResponse.conversationId,
            messageId: providerResponse.messageId,
            ...(providerResponse.status != null && { status: providerResponse.status }),
            ...(providerResponse.emailMessageId != null && { emailMessageId: providerResponse.emailMessageId }),
            ...(providerResponse.messageIds != null && { messageIds: providerResponse.messageIds }),
            ...(providerResponse.msg != null && { msg: providerResponse.msg })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
