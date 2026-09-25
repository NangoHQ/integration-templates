import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    user_id: z.string().describe('The ID of the user whose authenticators should be listed. Example: "auth0|123"')
});

const AuthenticatorSchema = z
    .object({
        id: z.string().describe('The ID of the authenticator.'),
        type: z.string().describe('The type of authenticator (e.g., sms, otp, email, push, recovery-code).'),
        confirmed: z.boolean().optional(),
        name: z.string().optional(),
        phone_number: z.string().optional(),
        email: z.string().optional(),
        created_at: z.string().optional(),
        enrolled_at: z.string().optional(),
        last_auth_at: z.string().optional()
    })
    .passthrough();

const OutputSchema = z.array(AuthenticatorSchema);

const action = createAction({
    description: 'List the MFA authenticators enrolled by a user in Auth0.',
    version: '1.0.2',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['read:authentication_methods'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // This endpoint is not published in Auth0's official Management API docs, but is
            // functional and commonly used to list legacy MFA authenticators for a user:
            // https://community.auth0.com/t/can-we-use-api-v2-users-userid-authenticators-get-post-calls-since-it-is-not-publicly-doumented/88638
            endpoint: `/api/v2/users/${encodeURIComponent(input.user_id)}/authenticators`,
            retries: 3
        });

        const parsed = z.array(z.unknown()).parse(response.data);
        return parsed.map((item) => AuthenticatorSchema.parse(item));
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
