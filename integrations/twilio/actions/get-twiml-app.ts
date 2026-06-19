import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    application_sid: z.string().describe('The SID of the TwiML Application to retrieve. Example: "APaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"')
});

const MetadataSchema = z.object({
    account_sid: z.string().describe('The Twilio Account SID. Example: "ACaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"')
});

const OutputSchema = z.object({
    account_sid: z.string().describe('The SID of the Account that created the Application resource.'),
    api_version: z.string().describe('The API version used to start a new TwiML session.'),
    date_created: z.string().describe('The date and time in GMT that the resource was created specified in RFC 2822 format.'),
    date_updated: z.string().describe('The date and time in GMT that the resource was last updated specified in RFC 2822 format.'),
    friendly_name: z.string().nullable().optional().describe('The string that you assigned to describe the resource.'),
    message_status_callback: z
        .string()
        .nullable()
        .optional()
        .describe('The URL we call using a POST method to send message status information to your application.'),
    sid: z.string().describe('The unique string that we created to identify the Application resource.'),
    sms_fallback_method: z.string().describe('The HTTP method we use to call sms_fallback_url.'),
    sms_fallback_url: z
        .string()
        .nullable()
        .optional()
        .describe('The URL that we call when an error occurs while retrieving or executing the TwiML from sms_url.'),
    sms_method: z.string().describe('The HTTP method we use to call sms_url.'),
    sms_status_callback: z
        .string()
        .nullable()
        .optional()
        .describe('The URL we call using a POST method to send status information about SMS messages that refer to the application.'),
    sms_url: z.string().nullable().optional().describe('The URL we call when the phone number receives an incoming SMS message.'),
    status_callback: z
        .string()
        .nullable()
        .optional()
        .describe('The URL we call using the status_callback_method to send status information to your application.'),
    status_callback_method: z.string().describe('The HTTP method we use to call status_callback.'),
    uri: z.string().describe('The URI of the resource, relative to https://api.twilio.com.'),
    voice_caller_id_lookup: z.boolean().describe("Whether we look up the caller's caller-ID name from the CNAM database."),
    voice_fallback_method: z.string().describe('The HTTP method we use to call voice_fallback_url.'),
    voice_fallback_url: z
        .string()
        .nullable()
        .optional()
        .describe('The URL that we call when an error occurs retrieving or executing the TwiML requested by url.'),
    voice_method: z.string().describe('The HTTP method we use to call voice_url.'),
    voice_url: z.string().nullable().optional().describe('The URL we call when the phone number assigned to this application receives a call.'),
    public_application_connect_enabled: z.boolean().describe('Whether to allow other Twilio accounts to dial this application using Dial verb.')
});

const action = createAction({
    description: 'Retrieve a single TwiML application from Twilio.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    metadata: MetadataSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const metadata = await nango.getMetadata();
        const metadataResult = MetadataSchema.safeParse(metadata);

        if (!metadataResult.success) {
            throw new nango.ActionError({
                type: 'invalid_metadata',
                message: 'account_sid is required in metadata.'
            });
        }

        const accountSid = metadataResult.data.account_sid;

        // https://www.twilio.com/docs/usage/api/applications#fetch-an-application-resource
        const response = await nango.get({
            endpoint: `/2010-04-01/Accounts/${encodeURIComponent(accountSid)}/Applications/${encodeURIComponent(input.application_sid)}.json`,
            retries: 3
        });

        if (!response.data || typeof response.data !== 'object') {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'TwiML application not found or invalid response received.',
                application_sid: input.application_sid
            });
        }

        const providerApplication = OutputSchema.parse(response.data);

        return providerApplication;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
