import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    service_sid: z.string().describe('The SID of the verification Service. Example: "VA9a01b6fde6aaf381bc6fe7424b7fe293"'),
    to: z.string().optional().describe('The phone number or email to verify. Example: "+15017122661"'),
    code: z.string().optional().describe('The 4-10 character verification code. Example: "1234"'),
    verification_sid: z.string().optional().describe('The SID of the Verification. Example: "VEaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"'),
    amount: z.string().optional().describe('The amount of the associated PSD2 transaction. Example: "€39.99"'),
    payee: z.string().optional().describe('The payee of the associated PSD2 transaction. Example: "Acme Inc."')
});

const ProviderResponseSchema = z.object({
    sid: z.string().optional(),
    service_sid: z.string().optional(),
    account_sid: z.string().optional(),
    to: z.string().optional(),
    channel: z.string().optional(),
    status: z.string().optional(),
    valid: z.boolean().optional(),
    amount: z.string().nullable().optional(),
    payee: z.string().nullable().optional(),
    sna_attempts_error_codes: z.array(z.unknown()).nullable().optional(),
    date_created: z.string().optional(),
    date_updated: z.string().optional()
});

const OutputSchema = z.object({
    sid: z.string().optional(),
    service_sid: z.string().optional(),
    account_sid: z.string().optional(),
    to: z.string().optional(),
    channel: z.string().optional(),
    status: z.string().optional(),
    valid: z.boolean().optional(),
    amount: z.string().optional(),
    payee: z.string().optional(),
    sna_attempts_error_codes: z.array(z.unknown()).optional(),
    date_created: z.string().optional(),
    date_updated: z.string().optional()
});

const action = createAction({
    description: 'Check a Twilio Verify code.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/check-verification',
        group: 'Verify'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        if (!input.to && !input.verification_sid) {
            throw new nango.ActionError({
                type: 'invalid_input',
                message: 'Either to or verification_sid must be provided.'
            });
        }

        const body = new URLSearchParams();
        if (input.to !== undefined) {
            body.append('To', input.to);
        }
        if (input.code !== undefined) {
            body.append('Code', input.code);
        }
        if (input.verification_sid !== undefined) {
            body.append('VerificationSid', input.verification_sid);
        }
        if (input.amount !== undefined) {
            body.append('Amount', input.amount);
        }
        if (input.payee !== undefined) {
            body.append('Payee', input.payee);
        }

        const response = await nango.post({
            // https://www.twilio.com/docs/verify/api/verification-check
            endpoint: `/v2/Services/${encodeURIComponent(input.service_sid)}/VerificationCheck`,
            baseUrlOverride: 'https://verify.twilio.com',
            data: body.toString(),
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        return {
            ...(providerResponse.sid !== undefined && { sid: providerResponse.sid }),
            ...(providerResponse.service_sid !== undefined && { service_sid: providerResponse.service_sid }),
            ...(providerResponse.account_sid !== undefined && { account_sid: providerResponse.account_sid }),
            ...(providerResponse.to !== undefined && { to: providerResponse.to }),
            ...(providerResponse.channel !== undefined && { channel: providerResponse.channel }),
            ...(providerResponse.status !== undefined && { status: providerResponse.status }),
            ...(providerResponse.valid !== undefined && { valid: providerResponse.valid }),
            ...(providerResponse.amount !== null && providerResponse.amount !== undefined && { amount: providerResponse.amount }),
            ...(providerResponse.payee !== null && providerResponse.payee !== undefined && { payee: providerResponse.payee }),
            ...(providerResponse.sna_attempts_error_codes !== null &&
                providerResponse.sna_attempts_error_codes !== undefined && {
                    sna_attempts_error_codes: providerResponse.sna_attempts_error_codes
                }),
            ...(providerResponse.date_created !== undefined && { date_created: providerResponse.date_created }),
            ...(providerResponse.date_updated !== undefined && { date_updated: providerResponse.date_updated })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
