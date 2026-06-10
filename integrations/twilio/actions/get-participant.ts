import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    conversationSid: z.string().describe('The unique ID of the Conversation for this participant. Example: "CHXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"'),
    participantSid: z
        .string()
        .describe('A 34 character string that uniquely identifies this participant resource. Example: "MBXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"')
});

const MessagingBindingSchema = z.object({
    type: z.string().optional(),
    address: z.string().optional(),
    proxy_address: z.string().optional(),
    projected_address: z.string().optional()
});

const OutputSchema = z
    .object({
        account_sid: z.string().optional(),
        conversation_sid: z.string().optional(),
        sid: z.string().optional(),
        identity: z.string().nullable().optional(),
        attributes: z.string().optional(),
        messaging_binding: MessagingBindingSchema.nullable().optional(),
        role_sid: z.string().optional(),
        date_created: z.string().optional(),
        date_updated: z.string().optional(),
        url: z.string().optional(),
        last_read_message_index: z.number().nullable().optional(),
        last_read_timestamp: z.string().nullable().optional()
    })
    .passthrough();

const action = createAction({
    description: 'Retrieve a single participant from a Twilio conversation.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/get-participant',
        group: 'Conversations'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://www.twilio.com/docs/conversations-classic/api/conversation-participant-resource
            endpoint: `/v1/Conversations/${encodeURIComponent(input.conversationSid)}/Participants/${encodeURIComponent(input.participantSid)}`,
            baseUrlOverride: 'https://conversations.twilio.com',
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Participant not found',
                conversationSid: input.conversationSid,
                participantSid: input.participantSid
            });
        }

        const parsed = OutputSchema.parse(response.data);

        return parsed;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
