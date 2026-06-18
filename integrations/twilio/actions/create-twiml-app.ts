import { z } from 'zod';
import { createAction, ProxyConfiguration } from 'nango';

const InputSchema = z.object({
    friendly_name: z.string().describe('The human-readable name of this TwiML application. Example: "My App"'),
    voice_url: z.string().optional().describe('The URL to request when a call is made to this application. Example: "https://example.com/voice"'),
    voice_method: z.string().optional().describe('The HTTP method to use when requesting the voice_url. Example: "POST"'),
    voice_fallback_url: z.string().optional().describe('The URL to request if the voice_url fails. Example: "https://example.com/voice-fallback"'),
    voice_fallback_method: z.string().optional().describe('The HTTP method to use when requesting the voice_fallback_url. Example: "POST"'),
    sms_url: z.string().optional().describe('The URL to request when an SMS is sent to this application. Example: "https://example.com/sms"'),
    sms_method: z.string().optional().describe('The HTTP method to use when requesting the sms_url. Example: "POST"'),
    status_callback: z.string().optional().describe('The URL to request for status callbacks. Example: "https://example.com/status"'),
    status_callback_method: z.string().optional().describe('The HTTP method to use when requesting the status_callback. Example: "POST"')
});

const ProviderApplicationSchema = z.object({
    sid: z.string(),
    account_sid: z.string(),
    friendly_name: z.string().nullable(),
    date_created: z.string().nullable().optional(),
    date_updated: z.string().nullable().optional(),
    api_version: z.string().nullable().optional(),
    voice_url: z.string().nullable().optional(),
    voice_method: z.string().nullable().optional(),
    voice_fallback_url: z.string().nullable().optional(),
    voice_fallback_method: z.string().nullable().optional(),
    sms_url: z.string().nullable().optional(),
    sms_method: z.string().nullable().optional(),
    status_callback: z.string().nullable().optional(),
    status_callback_method: z.string().nullable().optional(),
    uri: z.string().nullable().optional()
});

const OutputSchema = z.object({
    sid: z.string(),
    account_sid: z.string(),
    friendly_name: z.string(),
    date_created: z.string().optional(),
    date_updated: z.string().optional(),
    api_version: z.string().optional(),
    voice_url: z.string().optional(),
    voice_method: z.string().optional(),
    voice_fallback_url: z.string().optional(),
    voice_fallback_method: z.string().optional(),
    sms_url: z.string().optional(),
    sms_method: z.string().optional(),
    status_callback: z.string().optional(),
    status_callback_method: z.string().optional(),
    uri: z.string().optional()
});

const action = createAction({
    description: 'Create a TwiML application in Twilio',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['twilio_api'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const connection = await nango.getConnection();
        const credentials = connection.credentials;
        let accountSid: string | undefined;
        if (credentials && credentials.type === 'BASIC') {
            accountSid = credentials.username;
        }
        if (!accountSid) {
            const metadata = await nango.getMetadata();
            if (metadata && typeof metadata === 'object' && !Array.isArray(metadata)) {
                for (const [key, value] of Object.entries(metadata)) {
                    if (key === 'account_sid' && typeof value === 'string') {
                        accountSid = value;
                        break;
                    }
                }
            }
        }
        if (!accountSid) {
            throw new nango.ActionError({
                type: 'missing_credentials',
                message: 'Missing accountSid in connection credentials or metadata'
            });
        }

        const bodyData = new URLSearchParams();
        bodyData.append('FriendlyName', input.friendly_name);
        if (input.voice_url !== undefined) {
            bodyData.append('VoiceUrl', input.voice_url);
        }
        if (input.voice_method !== undefined) {
            bodyData.append('VoiceMethod', input.voice_method);
        }
        if (input.voice_fallback_url !== undefined) {
            bodyData.append('VoiceFallbackUrl', input.voice_fallback_url);
        }
        if (input.voice_fallback_method !== undefined) {
            bodyData.append('VoiceFallbackMethod', input.voice_fallback_method);
        }
        if (input.sms_url !== undefined) {
            bodyData.append('SmsUrl', input.sms_url);
        }
        if (input.sms_method !== undefined) {
            bodyData.append('SmsMethod', input.sms_method);
        }
        if (input.status_callback !== undefined) {
            bodyData.append('StatusCallback', input.status_callback);
        }
        if (input.status_callback_method !== undefined) {
            bodyData.append('StatusCallbackMethod', input.status_callback_method);
        }

        const config: ProxyConfiguration = {
            // https://www.twilio.com/docs/usage/api/applications#create-an-application-resource
            endpoint: `/2010-04-01/Accounts/${encodeURIComponent(accountSid)}/Applications.json`,
            data: bodyData.toString(),
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            retries: 1
        };

        const response = await nango.post(config);

        if (!response.data) {
            throw new nango.ActionError({
                type: 'api_error',
                message: 'Twilio API returned empty response data'
            });
        }

        const providerApp = ProviderApplicationSchema.parse(response.data);

        if (providerApp.friendly_name == null) {
            throw new nango.ActionError({
                type: 'api_error',
                message: 'Twilio API returned null friendly_name'
            });
        }

        return {
            sid: providerApp.sid,
            account_sid: providerApp.account_sid,
            friendly_name: providerApp.friendly_name,
            ...(providerApp.date_created != null && { date_created: providerApp.date_created }),
            ...(providerApp.date_updated != null && { date_updated: providerApp.date_updated }),
            ...(providerApp.api_version != null && { api_version: providerApp.api_version }),
            ...(providerApp.voice_url != null && { voice_url: providerApp.voice_url }),
            ...(providerApp.voice_method != null && { voice_method: providerApp.voice_method }),
            ...(providerApp.voice_fallback_url != null && { voice_fallback_url: providerApp.voice_fallback_url }),
            ...(providerApp.voice_fallback_method != null && { voice_fallback_method: providerApp.voice_fallback_method }),
            ...(providerApp.sms_url != null && { sms_url: providerApp.sms_url }),
            ...(providerApp.sms_method != null && { sms_method: providerApp.sms_method }),
            ...(providerApp.status_callback != null && { status_callback: providerApp.status_callback }),
            ...(providerApp.status_callback_method != null && { status_callback_method: providerApp.status_callback_method }),
            ...(providerApp.uri != null && { uri: providerApp.uri })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
