import type { ProxyConfiguration } from 'nango';
import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        email: z.string().email().optional().describe("The user's email address. Provide this or phone, not both."),
        phone: z.string().optional().describe("The user's phone number in E.164 format (e.g. +15551234567). Provide this or email, not both."),
        external_user_id: z.string().max(255).optional().describe('Optional. Your own identifier for the user, stored on the attempt for your reference.')
    })
    .refine(
        (data) => {
            const hasEmail = data.email !== undefined;
            const hasPhone = data.phone !== undefined;
            return (hasEmail && !hasPhone) || (!hasEmail && hasPhone);
        },
        {
            message: 'Provide exactly one of email or phone.'
        }
    );

const ProviderConnectAttemptSchema = z.object({
    object: z.literal('connect_attempt'),
    id: z.string(),
    channel: z.string(),
    expires_at: z.string()
});

const OutputSchema = z.object({
    object: z.literal('connect_attempt'),
    id: z.string(),
    channel: z.string(),
    expires_at: z.string()
});

const action = createAction({
    description: 'Send a one-time code to a user by email or phone to begin connecting them to your platform.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const data: Record<string, string> = {};
        if (input.email !== undefined) {
            data['email'] = input.email;
        }
        if (input.phone !== undefined) {
            data['phone'] = input.phone;
        }
        if (input.external_user_id !== undefined) {
            data['external_user_id'] = input.external_user_id;
        }

        const config: ProxyConfiguration = {
            // https://docs.agentcard.sh/api-reference/connect/send-a-code
            endpoint: '/api/v2/connect/start',
            data,
            retries: 3
        };

        const response = await nango.post(config);

        const attempt = ProviderConnectAttemptSchema.parse(response.data);

        return {
            object: attempt.object,
            id: attempt.id,
            channel: attempt.channel,
            expires_at: attempt.expires_at
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
