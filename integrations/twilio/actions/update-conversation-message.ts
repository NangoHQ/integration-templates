import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    conversationSid: z.string().describe('The unique ID of the Conversation for this message. Example: "CHxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"'),
    messageSid: z.string().describe('The unique ID of the message to update. Example: "IMxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"'),
    body: z.string().optional().describe('The content of the message, can be up to 1,600 characters long.'),
    attributes: z.string().optional().describe('A string metadata field containing structurally valid JSON.'),
    author: z.string().optional().describe("The channel specific identifier of the message's author."),
    dateCreated: z.string().optional().describe('The date that this resource was created.')
});

const ProviderMessageSchema = z.object({
    sid: z.string(),
    account_sid: z.string(),
    conversation_sid: z.string(),
    body: z.string().nullable(),
    media: z.array(z.record(z.string(), z.unknown())).nullable().optional(),
    author: z.string().nullable().optional(),
    participant_sid: z.string().nullable().optional(),
    attributes: z.string().nullable().optional(),
    date_created: z.string().nullable().optional(),
    date_updated: z.string().nullable().optional(),
    index: z.number().nullable().optional(),
    delivery: z.record(z.string(), z.unknown()).nullable().optional(),
    content_sid: z.string().nullable().optional(),
    url: z.string().nullable().optional(),
    links: z.record(z.string(), z.string()).nullable().optional()
});

const OutputSchema = z.object({
    sid: z.string(),
    account_sid: z.string(),
    conversation_sid: z.string(),
    body: z.string().optional(),
    media: z.array(z.record(z.string(), z.unknown())).optional(),
    author: z.string().optional(),
    participant_sid: z.string().optional(),
    attributes: z.string().optional(),
    date_created: z.string().optional(),
    date_updated: z.string().optional(),
    index: z.number().optional(),
    delivery: z.record(z.string(), z.unknown()).optional(),
    content_sid: z.string().optional(),
    url: z.string().optional(),
    links: z.record(z.string(), z.string()).optional()
});

const action = createAction({
    description: 'Update a message in a Twilio conversation.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: [''],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const formData = new URLSearchParams();
        if (input.body !== undefined) {
            formData.append('Body', input.body);
        }
        if (input.attributes !== undefined) {
            formData.append('Attributes', input.attributes);
        }
        if (input.author !== undefined) {
            formData.append('Author', input.author);
        }
        if (input.dateCreated !== undefined) {
            formData.append('DateCreated', input.dateCreated);
        }

        const response = await nango.post({
            // https://www.twilio.com/docs/conversations/api/conversation-message-resource#update-a-conversationmessage-resource
            baseUrlOverride: 'https://conversations.twilio.com',
            endpoint: `/v1/Conversations/${encodeURIComponent(input.conversationSid)}/Messages/${encodeURIComponent(input.messageSid)}`,
            data: formData.toString(),
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            retries: 10
        });

        const providerMessage = ProviderMessageSchema.parse(response.data);

        return {
            sid: providerMessage.sid,
            account_sid: providerMessage.account_sid,
            conversation_sid: providerMessage.conversation_sid,
            ...(providerMessage.body != null && { body: providerMessage.body }),
            ...(providerMessage.media != null && { media: providerMessage.media }),
            ...(providerMessage.author != null && { author: providerMessage.author }),
            ...(providerMessage.participant_sid != null && { participant_sid: providerMessage.participant_sid }),
            ...(providerMessage.attributes != null && { attributes: providerMessage.attributes }),
            ...(providerMessage.date_created != null && { date_created: providerMessage.date_created }),
            ...(providerMessage.date_updated != null && { date_updated: providerMessage.date_updated }),
            ...(providerMessage.index != null && { index: providerMessage.index }),
            ...(providerMessage.delivery != null && { delivery: providerMessage.delivery }),
            ...(providerMessage.content_sid != null && { content_sid: providerMessage.content_sid }),
            ...(providerMessage.url != null && { url: providerMessage.url }),
            ...(providerMessage.links != null && { links: providerMessage.links })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
