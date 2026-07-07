import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    userId: z.string().describe('User ID. Example: "00u14y5oijeYKVDn0698"'),
    sendEmail: z
        .boolean()
        .optional()
        .describe('Send reset password email to the user. If false, the reset password URL is returned in the response. Defaults to true per Okta API.')
});

const OutputSchema = z
    .object({
        resetPasswordUrl: z.string().optional()
    })
    .passthrough();

const action = createAction({
    description: 'Generate a one-time password reset token/link for a user.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['okta.users.manage'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const params: Record<string, string> = {};
        if (input.sendEmail !== undefined) {
            params['sendEmail'] = String(input.sendEmail);
        }

        const response = await nango.post({
            // https://developer.okta.com/docs/reference/api/users/#reset-password
            endpoint: `/api/v1/users/${encodeURIComponent(input.userId)}/lifecycle/reset_password`,
            params,
            retries: 3
        });

        const parsed = OutputSchema.parse(response.data);
        return parsed;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
