import { z } from 'zod';
import { createAction, type ProxyConfiguration } from 'nango';

const InputSchema = z.object({
    connection: z.string().min(1).describe('Name of the connection this user should be created in. Example: "Username-Password-Authentication"'),
    email: z.string().email().optional().describe('The user\'s email. Example: "john.doe@gmail.com"'),
    password: z.string().min(1).optional().describe('Initial password for this user. Only valid for auth0 connection strategy. Example: "secret"'),
    username: z.string().min(1).max(128).optional().describe('The user\'s username. Only valid if the connection requires a username. Example: "johndoe"'),
    name: z.string().min(1).max(300).optional().describe('The user\'s full name. Example: "John Doe"'),
    given_name: z.string().min(1).max(150).optional().describe('The user\'s given name(s). Example: "John"'),
    family_name: z.string().min(1).max(150).optional().describe('The user\'s family name(s). Example: "Doe"'),
    nickname: z.string().min(1).max(300).optional().describe('The user\'s nickname. Example: "Johnny"'),
    picture: z.string().optional().describe("A URI pointing to the user's picture."),
    user_metadata: z.record(z.string(), z.unknown()).optional().describe("Data related to the user that does not affect the application's core functionality."),
    app_metadata: z.record(z.string(), z.unknown()).optional().describe("Data related to the user that does affect the application's core functionality."),
    blocked: z.boolean().optional().describe('Whether this user was blocked by an administrator (true) or not (false).'),
    email_verified: z.boolean().optional().describe('Whether this email address is verified (true) or unverified (false).'),
    phone_number: z.string().optional().describe('The user\'s phone number (following the E.164 recommendation). Example: "+199999999999999"'),
    phone_verified: z.boolean().optional().describe('Whether this phone number has been verified (true) or not (false).'),
    verify_email: z.boolean().optional().describe('Whether the user will receive a verification email after creation (true) or no email (false).'),
    user_id: z.string().min(1).max(255).optional().describe('The external user\'s id provided by the identity provider. Example: "abc"')
});

const ProviderUserSchema = z
    .object({
        user_id: z.string().nullish(),
        email: z.string().nullish(),
        email_verified: z.boolean().nullish(),
        username: z.string().nullish(),
        phone_number: z.string().nullish(),
        phone_verified: z.boolean().nullish(),
        created_at: z.string().nullish(),
        updated_at: z.string().nullish(),
        name: z.string().nullish(),
        nickname: z.string().nullish(),
        picture: z.string().nullish(),
        blocked: z.boolean().nullish(),
        given_name: z.string().nullish(),
        family_name: z.string().nullish()
    })
    .passthrough();

const OutputSchema = z.object({
    user_id: z.string().optional(),
    email: z.string().optional(),
    email_verified: z.boolean().optional(),
    username: z.string().optional(),
    phone_number: z.string().optional(),
    phone_verified: z.boolean().optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional(),
    name: z.string().optional(),
    nickname: z.string().optional(),
    picture: z.string().optional(),
    blocked: z.boolean().optional(),
    given_name: z.string().optional(),
    family_name: z.string().optional()
});

const action = createAction({
    description: 'Create a user in Auth0.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/create-user',
        group: 'Users'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['create:users'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://auth0.com/docs/api/management/v2/users/post-users
            endpoint: '/api/v2/users',
            data: {
                connection: input.connection,
                ...(input.email !== undefined && { email: input.email }),
                ...(input.password !== undefined && { password: input.password }),
                ...(input.username !== undefined && { username: input.username }),
                ...(input.name !== undefined && { name: input.name }),
                ...(input.given_name !== undefined && { given_name: input.given_name }),
                ...(input.family_name !== undefined && { family_name: input.family_name }),
                ...(input.nickname !== undefined && { nickname: input.nickname }),
                ...(input.picture !== undefined && { picture: input.picture }),
                ...(input.user_metadata !== undefined && { user_metadata: input.user_metadata }),
                ...(input.app_metadata !== undefined && { app_metadata: input.app_metadata }),
                ...(input.blocked !== undefined && { blocked: input.blocked }),
                ...(input.email_verified !== undefined && { email_verified: input.email_verified }),
                ...(input.phone_number !== undefined && { phone_number: input.phone_number }),
                ...(input.phone_verified !== undefined && { phone_verified: input.phone_verified }),
                ...(input.verify_email !== undefined && { verify_email: input.verify_email }),
                ...(input.user_id !== undefined && { user_id: input.user_id })
            },
            retries: 3
        };

        const response = await nango.post(config);

        const providerUser = ProviderUserSchema.parse(response.data);

        return {
            ...(providerUser.user_id != null && { user_id: providerUser.user_id }),
            ...(providerUser.email != null && { email: providerUser.email }),
            ...(providerUser.email_verified != null && { email_verified: providerUser.email_verified }),
            ...(providerUser.username != null && { username: providerUser.username }),
            ...(providerUser.phone_number != null && { phone_number: providerUser.phone_number }),
            ...(providerUser.phone_verified != null && { phone_verified: providerUser.phone_verified }),
            ...(providerUser.created_at != null && { created_at: providerUser.created_at }),
            ...(providerUser.updated_at != null && { updated_at: providerUser.updated_at }),
            ...(providerUser.name != null && { name: providerUser.name }),
            ...(providerUser.nickname != null && { nickname: providerUser.nickname }),
            ...(providerUser.picture != null && { picture: providerUser.picture }),
            ...(providerUser.blocked != null && { blocked: providerUser.blocked }),
            ...(providerUser.given_name != null && { given_name: providerUser.given_name }),
            ...(providerUser.family_name != null && { family_name: providerUser.family_name })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
