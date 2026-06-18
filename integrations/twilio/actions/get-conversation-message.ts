import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    conversation_sid: z.string().describe('The unique ID of the Conversation. Example: "CHXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"'),
    message_sid: z.string().describe('The unique ID of the Message. Example: "IMXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"')
});

const MediaItemSchema = z.object({
    sid: z.string(),
    size: z.number(),
    content_type: z.string(),
    filename: z.string()
});

const DeliverySchema = z.object({
    total: z.number(),
    sent: z.string(),
    delivered: z.string(),
    read: z.string(),
    failed: z.string(),
    undelivered: z.string()
});

const LinksSchema = z.object({
    delivery_receipts: z.string().optional(),
    channel_metadata: z.string().optional()
});

const ProviderMessageSchema = z.object({
    sid: z.string(),
    account_sid: z.string(),
    conversation_sid: z.string(),
    body: z.string().nullable().optional(),
    media: z.array(MediaItemSchema).nullable().optional(),
    author: z.string().optional(),
    participant_sid: z.string().nullable().optional(),
    attributes: z.string().optional(),
    date_created: z.string().optional(),
    date_updated: z.string().nullable().optional(),
    index: z.number().optional(),
    delivery: DeliverySchema.nullable().optional(),
    content_sid: z.string().nullable().optional(),
    url: z.string().optional(),
    links: LinksSchema.optional()
});

const OutputSchema = ProviderMessageSchema;

const action = createAction({
    description: 'Retrieve a single message from a Twilio conversation.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://www.twilio.com/docs/conversations/api/conversation-message-resource
        const response = await nango.get({
            baseUrlOverride: 'https://conversations.twilio.com',
            endpoint: `/v1/Conversations/${encodeURIComponent(input.conversation_sid)}/Messages/${encodeURIComponent(input.message_sid)}`,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Conversation message not found.',
                conversation_sid: input.conversation_sid,
                message_sid: input.message_sid
            });
        }

        const providerMessage = ProviderMessageSchema.parse(response.data);

        return providerMessage;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
