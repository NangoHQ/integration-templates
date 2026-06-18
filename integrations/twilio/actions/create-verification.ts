import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    service_sid: z.string().describe('Twilio Verify Service SID. Example: "VA9a01b6fde6aaf381bc6fe7424b7fe293"'),
    to: z.string().describe('The phone number or email to verify in E.164 format. Example: "+18777804236"'),
    channel: z.enum(['sms', 'call', 'email', 'whatsapp']).describe('The verification channel.')
});

const ProviderVerificationSchema = z.object({
    sid: z.string(),
    service_sid: z.string(),
    account_sid: z.string(),
    to: z.string(),
    channel: z.string(),
    status: z.string(),
    valid: z.boolean().optional().nullable(),
    date_created: z.string().optional().nullable(),
    date_updated: z.string().optional().nullable(),
    url: z.string().optional().nullable()
});

const OutputSchema = z.object({
    sid: z.string(),
    service_sid: z.string(),
    account_sid: z.string(),
    to: z.string(),
    channel: z.string(),
    status: z.string(),
    valid: z.boolean().optional(),
    date_created: z.string().optional(),
    date_updated: z.string().optional(),
    url: z.string().optional()
});

const action = createAction({
    description: 'Start a Twilio Verify verification.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const body = new URLSearchParams({
            To: input.to,
            Channel: input.channel
        });

        const response = await nango.post({
            // https://www.twilio.com/docs/verify/api/verification
            endpoint: `/v2/Services/${encodeURIComponent(input.service_sid)}/Verifications`,
            baseUrlOverride: 'https://verify.twilio.com',
            data: body.toString(),
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            retries: 1
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: 'Twilio did not return a verification response.'
            });
        }

        const verification = ProviderVerificationSchema.parse(response.data);

        return {
            sid: verification.sid,
            service_sid: verification.service_sid,
            account_sid: verification.account_sid,
            to: verification.to,
            channel: verification.channel,
            status: verification.status,
            ...(verification.valid != null && { valid: verification.valid }),
            ...(verification.date_created != null && { date_created: verification.date_created }),
            ...(verification.date_updated != null && { date_updated: verification.date_updated }),
            ...(verification.url != null && { url: verification.url })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
