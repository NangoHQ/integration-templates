import { z } from 'zod';
import { createAction, type ProxyConfiguration } from 'nango';

const InputSchema = z.object({
    ServiceSid: z.string().describe('The SID of the Verify Service to update. Example: "VA9a01b6fde6aaf381bc6fe7424b7fe293"'),
    FriendlyName: z.string().optional().describe('A human-readable name for the Verify Service.'),
    CodeLength: z.number().optional().describe('The length of the verification code to generate.'),
    LookupEnabled: z.boolean().optional().describe('Whether to perform a lookup with each verification started.'),
    SkipSmsToLandlines: z.boolean().optional().describe('Whether to skip sending SMS verifications to landlines.'),
    TtsName: z.string().optional().describe('The name of an alternative text-to-speech service to use in phone calls.')
});

const OutputSchema = z
    .object({
        sid: z.string(),
        account_sid: z.string(),
        friendly_name: z.string().optional(),
        code_length: z.number().optional(),
        lookup_enabled: z.boolean().optional(),
        skip_sms_to_landlines: z.boolean().optional(),
        tts_name: z.string().optional(),
        psd2_enabled: z.boolean().optional(),
        dtmf_input_required: z.boolean().optional(),
        do_not_share_warning_enabled: z.boolean().optional(),
        custom_code_enabled: z.boolean().optional(),
        default_template_sid: z.string().optional(),
        verify_event_subscription_enabled: z.boolean().optional(),
        date_created: z.string().optional(),
        date_updated: z.string().optional(),
        url: z.string().optional()
    })
    .passthrough();

const action = createAction({
    description: 'Update a Verify service in Twilio.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const body = new URLSearchParams();

        if (input.FriendlyName !== undefined) {
            body.append('FriendlyName', input.FriendlyName);
        }
        if (input.CodeLength !== undefined) {
            body.append('CodeLength', String(input.CodeLength));
        }
        if (input.LookupEnabled !== undefined) {
            body.append('LookupEnabled', String(input.LookupEnabled));
        }
        if (input.SkipSmsToLandlines !== undefined) {
            body.append('SkipSmsToLandlines', String(input.SkipSmsToLandlines));
        }
        if (input.TtsName !== undefined) {
            body.append('TtsName', input.TtsName);
        }

        const config: ProxyConfiguration = {
            // https://www.twilio.com/docs/verify/api/service
            baseUrlOverride: 'https://verify.twilio.com',
            // https://www.twilio.com/docs/verify/api/service
            endpoint: `/v2/Services/${encodeURIComponent(input.ServiceSid)}`,
            data: body.toString(),
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            retries: 3
        };

        const response = await nango.post(config);

        const raw = z.record(z.string(), z.unknown()).parse(response.data);
        const stripped = Object.fromEntries(Object.entries(raw).filter(([, value]) => value !== null));
        const providerService = OutputSchema.parse(stripped);

        return providerService;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
