import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    user_id: z.string().describe('Connected user ID. Example: "cmseows7p000fk604g3qee8bs"'),
    phone_number: z
        .string()
        .e164()
        .optional()
        .describe(
            'E.164 phone number to send the verification code to. Only used if the user has no phone on file; otherwise the on-file number is used instead. Example: "+15551234567"'
        )
});

const ProviderOutputSchema = z.object({
    object: z.string(),
    status: z.string(),
    channel: z.string().optional(),
    phone: z.string().optional(),
    expires_in_seconds: z.number().optional()
});

const OutputSchema = z.object({
    object: z.string(),
    status: z.string(),
    channel: z.string().optional(),
    phone: z.string().optional(),
    expires_in_seconds: z.number().optional()
});

const action = createAction({
    description: 'Send a connected user a one-time code to their phone, required before wallet funding.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://docs.agentcard.sh/companies/api/reference/wallet-phone-start.md
            endpoint: '/api/v2/wallet/phone/start',
            data: {
                user_id: input.user_id,
                ...(input.phone_number !== undefined && { phone_number: input.phone_number })
            },
            retries: 3
        });

        const providerData = ProviderOutputSchema.parse(response.data);

        return {
            object: providerData.object,
            status: providerData.status,
            ...(providerData.channel !== undefined && { channel: providerData.channel }),
            ...(providerData.phone !== undefined && { phone: providerData.phone }),
            ...(providerData.expires_in_seconds !== undefined && { expires_in_seconds: providerData.expires_in_seconds })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
