import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    conversationSid: z.string().describe('The SID of the Conversation to add the participant to. Example: "CHxxx"'),
    identity: z.string().optional().describe('The unique identity of the user for a chat participant. Example: "user_1"'),
    messagingBindingAddress: z.string().optional().describe('The phone number address for an SMS participant. Example: "+1234567890"'),
    messagingBindingProxyAddress: z.string().optional().describe('The Twilio phone number to proxy the SMS participant. Example: "+19843341706"')
});

const ProviderParticipantSchema = z.object({
    sid: z.string(),
    account_sid: z.string().optional(),
    conversation_sid: z.string().optional(),
    identity: z.string().optional().nullable(),
    attributes: z.string().optional().nullable(),
    date_created: z.string().optional().nullable(),
    date_updated: z.string().optional().nullable(),
    role_sid: z.string().optional().nullable(),
    messaging_binding: z
        .object({
            address: z.string().optional().nullable(),
            proxy_address: z.string().optional().nullable(),
            type: z.string().optional().nullable()
        })
        .optional()
        .nullable(),
    url: z.string().optional().nullable(),
    last_read_message_index: z.union([z.number(), z.string()]).optional().nullable(),
    last_read_timestamp: z.string().optional().nullable()
});

const OutputSchema = z.object({
    sid: z.string(),
    accountSid: z.string().optional(),
    conversationSid: z.string().optional(),
    identity: z.string().optional(),
    attributes: z.string().optional(),
    dateCreated: z.string().optional(),
    dateUpdated: z.string().optional(),
    roleSid: z.string().optional(),
    messagingBinding: z
        .object({
            address: z.string().optional().nullable(),
            proxyAddress: z.string().optional().nullable(),
            type: z.string().optional().nullable()
        })
        .optional(),
    url: z.string().optional(),
    lastReadMessageIndex: z.union([z.number(), z.string()]).optional(),
    lastReadTimestamp: z.string().optional()
});

const action = createAction({
    description: 'Add a participant to a Twilio conversation.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        if (!input.identity && !input.messagingBindingAddress) {
            throw new nango.ActionError({
                type: 'invalid_input',
                message: 'Either identity or messagingBindingAddress must be provided.'
            });
        }

        if (input.messagingBindingAddress !== undefined && input.messagingBindingProxyAddress === undefined) {
            throw new nango.ActionError({
                type: 'invalid_input',
                message: 'messagingBindingProxyAddress is required when messagingBindingAddress is provided.'
            });
        }

        const body = new URLSearchParams();
        if (input.identity !== undefined) {
            body.append('Identity', input.identity);
        }
        if (input.messagingBindingAddress !== undefined) {
            body.append('MessagingBinding.Address', input.messagingBindingAddress);
        }
        if (input.messagingBindingProxyAddress !== undefined) {
            body.append('MessagingBinding.ProxyAddress', input.messagingBindingProxyAddress);
        }

        const response = await nango.post({
            // https://www.twilio.com/docs/conversations/api/conversation-participant-resource
            endpoint: `/v1/Conversations/${encodeURIComponent(input.conversationSid)}/Participants`,
            baseUrlOverride: 'https://conversations.twilio.com',
            data: body.toString(),
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            retries: 3
        });

        const providerParticipant = ProviderParticipantSchema.parse(response.data);

        return {
            sid: providerParticipant.sid,
            ...(providerParticipant.account_sid !== undefined && { accountSid: providerParticipant.account_sid }),
            ...(providerParticipant.conversation_sid !== undefined && { conversationSid: providerParticipant.conversation_sid }),
            ...(providerParticipant.identity != null && { identity: providerParticipant.identity }),
            ...(providerParticipant.attributes != null && { attributes: providerParticipant.attributes }),
            ...(providerParticipant.date_created != null && { dateCreated: providerParticipant.date_created }),
            ...(providerParticipant.date_updated != null && { dateUpdated: providerParticipant.date_updated }),
            ...(providerParticipant.role_sid != null && { roleSid: providerParticipant.role_sid }),
            ...(providerParticipant.messaging_binding != null && {
                messagingBinding: {
                    address: providerParticipant.messaging_binding.address,
                    proxyAddress: providerParticipant.messaging_binding.proxy_address,
                    type: providerParticipant.messaging_binding.type
                }
            }),
            ...(providerParticipant.url != null && { url: providerParticipant.url }),
            ...(providerParticipant.last_read_message_index != null && { lastReadMessageIndex: providerParticipant.last_read_message_index }),
            ...(providerParticipant.last_read_timestamp != null && { lastReadTimestamp: providerParticipant.last_read_timestamp })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
