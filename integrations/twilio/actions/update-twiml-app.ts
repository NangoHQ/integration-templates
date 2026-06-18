import { z } from 'zod';
import { createAction } from 'nango';

const HttpMethodSchema = z.enum(['GET', 'POST']);

const InputSchema = z.object({
    applicationSid: z.string().describe('The SID of the TwiML Application to update. Example: "APXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"'),
    friendlyName: z.string().optional().describe('A descriptive name for the application. Example: "My App"'),
    voiceUrl: z.string().optional().describe('The URL to call when the phone number receives a call. Example: "https://example.com/voice"'),
    voiceMethod: HttpMethodSchema.optional().describe('The HTTP method to use for VoiceUrl. Example: "POST"'),
    voiceFallbackUrl: z.string().optional().describe('The URL to call when an error occurs retrieving VoiceUrl. Example: "https://example.com/voice-fallback"'),
    smsUrl: z.string().optional().describe('The URL to call when the phone number receives an SMS. Example: "https://example.com/sms"'),
    smsMethod: HttpMethodSchema.optional().describe('The HTTP method to use for SmsUrl. Example: "POST"'),
    statusCallback: z.string().optional().describe('The URL to call for status callbacks. Example: "https://example.com/status"')
});

const ProviderApplicationSchema = z.object({
    account_sid: z.string(),
    api_version: z.string().optional(),
    date_created: z.string().optional(),
    date_updated: z.string().optional(),
    friendly_name: z.string().optional(),
    message_status_callback: z.string().nullable().optional(),
    sid: z.string(),
    sms_fallback_method: z.string().optional(),
    sms_fallback_url: z.string().nullable().optional(),
    sms_method: z.string().optional(),
    sms_status_callback: z.string().nullable().optional(),
    sms_url: z.string().nullable().optional(),
    status_callback: z.string().nullable().optional(),
    status_callback_method: z.string().optional(),
    uri: z.string().optional(),
    voice_caller_id_lookup: z.boolean().optional(),
    voice_fallback_method: z.string().optional(),
    voice_fallback_url: z.string().nullable().optional(),
    voice_method: z.string().optional(),
    voice_url: z.string().nullable().optional(),
    public_application_connect_enabled: z.boolean().optional()
});

const OutputSchema = ProviderApplicationSchema;

const action = createAction({
    description: 'Update a TwiML application in Twilio.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['twilio'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const MetadataSchema = z.object({
            account_sid: z.string()
        });
        const metadata = await nango.getMetadata();
        const parsedMetadata = MetadataSchema.safeParse(metadata);
        if (!parsedMetadata.success) {
            throw new nango.ActionError({
                type: 'missing_account_sid',
                message: 'Account SID is missing from the connection metadata.'
            });
        }
        const accountSid = parsedMetadata.data.account_sid;

        const formData = new URLSearchParams();
        if (input.friendlyName !== undefined) {
            formData.append('FriendlyName', input.friendlyName);
        }
        if (input.voiceUrl !== undefined) {
            formData.append('VoiceUrl', input.voiceUrl);
        }
        if (input.voiceMethod !== undefined) {
            formData.append('VoiceMethod', input.voiceMethod);
        }
        if (input.voiceFallbackUrl !== undefined) {
            formData.append('VoiceFallbackUrl', input.voiceFallbackUrl);
        }
        if (input.smsUrl !== undefined) {
            formData.append('SmsUrl', input.smsUrl);
        }
        if (input.smsMethod !== undefined) {
            formData.append('SmsMethod', input.smsMethod);
        }
        if (input.statusCallback !== undefined) {
            formData.append('StatusCallback', input.statusCallback);
        }

        // https://www.twilio.com/docs/usage/api/applications
        const response = await nango.post({
            endpoint: `/2010-04-01/Accounts/${encodeURIComponent(accountSid)}/Applications/${encodeURIComponent(input.applicationSid)}.json`,
            data: formData.toString(),
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            retries: 1
        });

        const providerApplication = ProviderApplicationSchema.parse(response.data);

        return providerApplication;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
