import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    user_id: z.string().describe('The connected user\'s id. Example: "usr_123"'),
    code: z.string().describe('The one-time code the user entered. Always 111111 in sandbox.'),
    phone_number: z.string().e164().optional().describe('Required only when the code was sent to a number you provided. E.164 format (e.g. +14155550100).')
});

const ProviderPhoneVerificationSchema = z.object({
    object: z.literal('phone_verification'),
    status: z.enum(['sent', 'already_verified', 'verified']),
    channel: z.string().optional(),
    phone: z.string().optional(),
    expires_in_seconds: z.number().optional()
});

const OutputSchema = ProviderPhoneVerificationSchema;

const action = createAction({
    description: 'Verify the one-time phone code, unlocking wallet funding for 60 days.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://docs.agentcard.sh/companies/api/reference/wallet-phone-verify
            endpoint: '/api/v2/wallet/phone/verify',
            data: {
                user_id: input.user_id,
                code: input.code,
                ...(input.phone_number !== undefined && { phone_number: input.phone_number })
            },
            retries: 3
        });

        const providerVerification = ProviderPhoneVerificationSchema.parse(response.data);

        return providerVerification;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
