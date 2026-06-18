import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('Auth0 user ID. Example: "auth0|507f1f77bcf86cd799439020"')
});

const UserIdentitySchema = z.object({
    connection: z.string().optional(),
    user_id: z.string().optional(),
    provider: z.string().optional(),
    isSocial: z.boolean().optional(),
    access_token: z.string().optional(),
    access_token_secret: z.string().optional(),
    refresh_token: z.string().optional(),
    profileData: z.record(z.string(), z.unknown()).optional()
});

const UserSchema = z
    .object({
        user_id: z.string().optional(),
        email: z.string().optional(),
        email_verified: z.boolean().optional(),
        username: z.string().optional(),
        phone_number: z.string().optional(),
        phone_verified: z.boolean().optional(),
        created_at: z.string().optional(),
        updated_at: z.string().optional(),
        identities: z.array(UserIdentitySchema).optional(),
        app_metadata: z.record(z.string(), z.unknown()).optional(),
        user_metadata: z.record(z.string(), z.unknown()).optional(),
        picture: z.string().optional(),
        name: z.string().optional(),
        nickname: z.string().optional(),
        multifactor: z.array(z.string()).optional(),
        multifactor_last_modified: z.string().optional(),
        last_ip: z.string().optional(),
        last_login: z.string().optional(),
        last_password_reset: z.string().optional(),
        logins_count: z.number().optional(),
        blocked: z.boolean().optional(),
        given_name: z.string().optional(),
        family_name: z.string().optional()
    })
    .passthrough();

const action = createAction({
    description: 'Retrieve a single user from Auth0.',
    version: '1.0.1',
    input: InputSchema,
    output: UserSchema,
    scopes: ['read:users'],

    exec: async (nango, input): Promise<z.infer<typeof UserSchema>> => {
        const response = await nango.get({
            // https://auth0.com/docs/api/management/v2/users/get-users-by-id
            endpoint: `/api/v2/users/${encodeURIComponent(input.id)}`,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'User not found',
                user_id: input.id
            });
        }

        const user = UserSchema.parse(response.data);
        return user;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
