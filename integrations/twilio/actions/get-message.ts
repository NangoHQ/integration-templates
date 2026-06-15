import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    message_sid: z.string().describe('The SID of the Message resource to retrieve. Example: SMXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX')
});

const MessageSchema = z.object({
    account_sid: z.string().optional(),
    api_version: z.string().optional(),
    body: z.string().optional(),
    date_created: z.string().optional(),
    date_sent: z.string().optional(),
    date_updated: z.string().optional(),
    direction: z.string().optional(),
    error_code: z.number().nullable().optional(),
    error_message: z.string().nullable().optional(),
    from: z.string().optional(),
    messaging_service_sid: z.string().nullable().optional(),
    num_media: z.string().optional(),
    num_segments: z.string().optional(),
    price: z.string().nullable().optional(),
    price_unit: z.string().nullable().optional(),
    sid: z.string().optional(),
    status: z.string().optional(),
    subresource_uris: z.record(z.string(), z.string()).optional(),
    to: z.string().optional(),
    uri: z.string().optional()
});

const OutputSchema = MessageSchema;

const action = createAction({
    description: 'Retrieve a single message from Twilio.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/get-message',
        group: 'Messaging'
    },
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const connection = await nango.getConnection();
        const credentials = connection.credentials;
        let accountSid: string | undefined;

        if (
            credentials &&
            typeof credentials === 'object' &&
            'type' in credentials &&
            credentials.type === 'BASIC' &&
            'username' in credentials &&
            typeof credentials.username === 'string'
        ) {
            accountSid = credentials.username;
        }

        if (!accountSid) {
            const metadata = await nango.getMetadata();
            const MetadataSchema = z.object({
                account_sid: z.string().optional()
            });
            const parsed = MetadataSchema.safeParse(metadata);
            if (parsed.success) {
                accountSid = parsed.data.account_sid;
            }
        }

        if (!accountSid) {
            throw new nango.ActionError({
                type: 'invalid_credentials',
                message: 'Unable to determine Account SID from connection credentials or metadata.'
            });
        }

        const response = await nango.get({
            // https://www.twilio.com/docs/messaging/api/message-resource#fetch-a-message-resource
            endpoint: `/2010-04-01/Accounts/${encodeURIComponent(accountSid)}/Messages/${encodeURIComponent(input.message_sid)}.json`,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Message not found',
                message_sid: input.message_sid
            });
        }

        const message = MessageSchema.parse(response.data);
        return message;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
