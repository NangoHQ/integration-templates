import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    user_id: z.string().describe('The user_id of the primary account. Example: "auth0|123"'),
    provider: z.string().describe('The identity provider name of the secondary linked account. Example: "google-oauth2"'),
    identity_user_id: z.string().describe('The user_id of the secondary linked account to unlink. Example: "123456789081523216417"')
});

const ProfileDataSchema = z
    .object({
        email: z.string().optional(),
        email_verified: z.boolean().optional(),
        name: z.string().optional(),
        username: z.string().optional(),
        given_name: z.string().optional(),
        phone_number: z.string().optional(),
        phone_verified: z.boolean().optional(),
        family_name: z.string().optional()
    })
    .passthrough();

const IdentitySchema = z.object({
    provider: z.string(),
    user_id: z.string(),
    connection: z.string(),
    isSocial: z.boolean().optional(),
    access_token: z.string().optional(),
    access_token_secret: z.string().optional(),
    refresh_token: z.string().optional(),
    expires_in: z.number().optional(),
    profileData: ProfileDataSchema.optional()
});

const OutputSchema = z.object({
    identities: z.array(IdentitySchema)
});

const action = createAction({
    description: 'Unlink a secondary user identity from a primary account in Auth0',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/unlink-user-account',
        group: 'Users'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['update:users'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.delete({
            // https://auth0.com/docs/api/management/v2/users/delete-user-identity-by-user-id
            endpoint: `/api/v2/users/${encodeURIComponent(input.user_id)}/identities/${encodeURIComponent(input.provider)}/${encodeURIComponent(input.identity_user_id)}`,
            retries: 3
        });

        const identities = z.array(IdentitySchema).parse(response.data);

        return {
            identities
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
