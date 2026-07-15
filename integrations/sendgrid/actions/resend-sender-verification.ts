import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    sender_id: z.string().describe('The ID of the sender identity to resend verification for. Example: "9389986"')
});

const OutputSchema = z.object({
    success: z.boolean()
});

const action = createAction({
    description: 'Resend the verification email for a sender identity.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['user.profile'], // Basic SendGrid scope required for sender identity operations

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://www.twilio.com/docs/sendgrid/api-reference/sender-identity/resend-verification
        await nango.post({
            endpoint: `/v3/verified_senders/resend/${encodeURIComponent(input.sender_id)}`,
            retries: 10
        });

        return { success: true };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
