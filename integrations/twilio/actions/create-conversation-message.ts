import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    ConversationSid: z.string().describe('The SID of the Conversation. Example: "CH7455d9a8e3c541da993a275b699d6c83"'),
    Body: z.string().optional().describe('The text content of the message. Required if MediaSid is not provided.'),
    MediaSid: z.string().optional().describe('The SID of the Media to include. Required if Body is not provided.'),
    Author: z.string().optional().describe('The identity of the message author. Example: "user_1"'),
    DateCreated: z.string().optional().describe('The ISO 8601 date and time the message was created.'),
    DateUpdated: z.string().optional().describe('The ISO 8601 date and time the message was updated.'),
    Attributes: z.string().optional().describe('JSON string of custom attributes for the message.')
});

const ProviderMessageSchema = z
    .object({
        sid: z.string(),
        account_sid: z.string().nullish(),
        conversation_sid: z.string().nullish(),
        body: z.string().nullish(),
        author: z.string().nullish(),
        date_created: z.string().nullish(),
        date_updated: z.string().nullish(),
        index: z.number().nullish(),
        attributes: z.string().nullish(),
        media: z.array(z.unknown()).nullish(),
        url: z.string().nullish(),
        links: z.record(z.string(), z.unknown()).nullish()
    })
    .passthrough();

const OutputSchema = z.object({
    sid: z.string(),
    account_sid: z.string().optional(),
    conversation_sid: z.string().optional(),
    body: z.string().optional(),
    author: z.string().optional(),
    date_created: z.string().optional(),
    date_updated: z.string().optional(),
    index: z.number().optional(),
    attributes: z.string().optional(),
    media: z.array(z.unknown()).optional(),
    url: z.string().optional(),
    links: z.record(z.string(), z.unknown()).optional()
});

const action = createAction({
    description: 'Post a message into a Twilio conversation',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/create-conversation-message',
        group: 'Conversations'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        if (!input.Body && !input.MediaSid) {
            throw new nango.ActionError({
                type: 'invalid_input',
                message: 'Either Body or MediaSid is required.'
            });
        }

        const formData = new URLSearchParams();

        if (input.Body) {
            formData.append('Body', input.Body);
        }
        if (input.MediaSid) {
            formData.append('MediaSid', input.MediaSid);
        }
        if (input.Author !== undefined) {
            formData.append('Author', input.Author);
        }
        if (input.DateCreated !== undefined) {
            formData.append('DateCreated', input.DateCreated);
        }
        if (input.DateUpdated !== undefined) {
            formData.append('DateUpdated', input.DateUpdated);
        }
        if (input.Attributes !== undefined) {
            formData.append('Attributes', input.Attributes);
        }

        // https://www.twilio.com/docs/conversations/api/conversation-message-resource#create-a-conversationmessage
        const response = await nango.post({
            baseUrlOverride: 'https://conversations.twilio.com',
            endpoint: `/v1/Conversations/${encodeURIComponent(input.ConversationSid)}/Messages`,
            data: formData.toString(),
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            retries: 3
        });

        const providerMessage = ProviderMessageSchema.parse(response.data);

        return {
            sid: providerMessage.sid,
            ...(providerMessage.account_sid != null && { account_sid: providerMessage.account_sid }),
            ...(providerMessage.conversation_sid != null && { conversation_sid: providerMessage.conversation_sid }),
            ...(providerMessage.body != null && { body: providerMessage.body }),
            ...(providerMessage.author != null && { author: providerMessage.author }),
            ...(providerMessage.date_created != null && { date_created: providerMessage.date_created }),
            ...(providerMessage.date_updated != null && { date_updated: providerMessage.date_updated }),
            ...(providerMessage.index != null && { index: providerMessage.index }),
            ...(providerMessage.attributes != null && { attributes: providerMessage.attributes }),
            ...(providerMessage.media != null && { media: providerMessage.media }),
            ...(providerMessage.url != null && { url: providerMessage.url }),
            ...(providerMessage.links != null && { links: providerMessage.links })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
