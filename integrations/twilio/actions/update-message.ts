import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    messageSid: z.string().describe('The SID of the Message resource to update. Example: "SMXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"'),
    body: z.string().optional().describe('The new body of the Message resource. Set to an empty string to redact the message content.'),
    status: z.enum(['canceled']).optional().describe('The new status of the Message resource. Only "canceled" is supported for outbound queued messages.')
});

const ProviderMessageSchema = z.object({
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
    num_media: z.string().optional(),
    num_segments: z.string().optional(),
    price: z.string().nullable().optional(),
    price_unit: z.string().nullable().optional(),
    messaging_service_sid: z.string().nullable().optional(),
    sid: z.string().optional(),
    status: z.string().optional(),
    subresource_uris: z.record(z.string(), z.string()).optional(),
    to: z.string().optional(),
    uri: z.string().optional()
});

const OutputSchema = z.object({
    accountSid: z.string().optional(),
    apiVersion: z.string().optional(),
    body: z.string().optional(),
    dateCreated: z.string().optional(),
    dateSent: z.string().optional(),
    dateUpdated: z.string().optional(),
    direction: z.string().optional(),
    errorCode: z.number().nullable().optional(),
    errorMessage: z.string().nullable().optional(),
    from: z.string().optional(),
    numMedia: z.string().optional(),
    numSegments: z.string().optional(),
    price: z.string().nullable().optional(),
    priceUnit: z.string().nullable().optional(),
    messagingServiceSid: z.string().nullable().optional(),
    sid: z.string().optional(),
    status: z.string().optional(),
    subresourceUris: z.record(z.string(), z.string()).optional(),
    to: z.string().optional(),
    uri: z.string().optional()
});

const action = createAction({
    description: 'Update a message in Twilio.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/update-message',
        group: 'Messages'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const token = await nango.getToken();
        if (typeof token !== 'object' || token === null || !('username' in token) || typeof token.username !== 'string') {
            throw new nango.ActionError({
                type: 'invalid_credentials',
                message: 'Missing Account SID in connection credentials.'
            });
        }
        const accountSid = token.username;

        const body = new URLSearchParams();
        if (input.body !== undefined) {
            body.append('Body', input.body);
        }
        if (input.status !== undefined) {
            body.append('Status', input.status);
        }

        const response = await nango.post({
            // https://www.twilio.com/docs/sms/api/message-resource#update-a-message-resource
            endpoint: `/2010-04-01/Accounts/${encodeURIComponent(accountSid)}/Messages/${encodeURIComponent(input.messageSid)}.json`,
            data: body.toString(),
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            retries: 10
        });

        const providerMessage = ProviderMessageSchema.parse(response.data);

        return {
            accountSid: providerMessage.account_sid,
            apiVersion: providerMessage.api_version,
            body: providerMessage.body,
            dateCreated: providerMessage.date_created,
            dateSent: providerMessage.date_sent,
            dateUpdated: providerMessage.date_updated,
            direction: providerMessage.direction,
            errorCode: providerMessage.error_code,
            errorMessage: providerMessage.error_message,
            from: providerMessage.from,
            numMedia: providerMessage.num_media,
            numSegments: providerMessage.num_segments,
            price: providerMessage.price,
            priceUnit: providerMessage.price_unit,
            messagingServiceSid: providerMessage.messaging_service_sid,
            sid: providerMessage.sid,
            status: providerMessage.status,
            subresourceUris: providerMessage.subresource_uris,
            to: providerMessage.to,
            uri: providerMessage.uri
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
