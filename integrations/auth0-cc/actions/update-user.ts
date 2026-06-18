import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    user_id: z.string().describe('User ID. Example: "auth0|123"'),
    blocked: z.boolean().optional(),
    email_verified: z.boolean().optional(),
    email: z.string().email().nullable().optional(),
    phone_number: z.string().nullable().optional(),
    phone_verified: z.boolean().optional(),
    user_metadata: z.record(z.string(), z.unknown()).optional(),
    app_metadata: z.record(z.string(), z.unknown()).optional(),
    given_name: z.string().nullable().optional(),
    family_name: z.string().nullable().optional(),
    name: z.string().nullable().optional(),
    nickname: z.string().nullable().optional(),
    picture: z.string().nullable().optional(),
    verify_email: z.boolean().optional(),
    verify_phone_number: z.boolean().optional(),
    password: z.string().nullable().optional(),
    connection: z.string().optional(),
    client_id: z.string().optional(),
    username: z.string().nullable().optional()
});

const OutputSchema = z.object({
    user_id: z.string(),
    email: z.string().optional(),
    email_verified: z.boolean().optional(),
    username: z.string().optional(),
    phone_number: z.string().optional(),
    phone_verified: z.boolean().optional(),
    name: z.string().optional(),
    nickname: z.string().optional(),
    picture: z.string().optional(),
    blocked: z.boolean().optional(),
    given_name: z.string().optional(),
    family_name: z.string().optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional(),
    user_metadata: z.record(z.string(), z.unknown()).optional(),
    app_metadata: z.record(z.string(), z.unknown()).optional()
});

const action = createAction({
    description: 'Update a user in Auth0.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['update:users', 'update:users_app_metadata', 'update:current_user_metadata'],
    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.patch({
            // https://auth0.com/docs/api/management/v2/users/patch-users-by-id
            endpoint: `/api/v2/users/${encodeURIComponent(input.user_id)}`,
            data: {
                ...(input.blocked !== undefined && { blocked: input.blocked }),
                ...(input.email_verified !== undefined && { email_verified: input.email_verified }),
                ...(input.email !== undefined && { email: input.email }),
                ...(input.phone_number !== undefined && { phone_number: input.phone_number }),
                ...(input.phone_verified !== undefined && { phone_verified: input.phone_verified }),
                ...(input.user_metadata !== undefined && { user_metadata: input.user_metadata }),
                ...(input.app_metadata !== undefined && { app_metadata: input.app_metadata }),
                ...(input.given_name !== undefined && { given_name: input.given_name }),
                ...(input.family_name !== undefined && { family_name: input.family_name }),
                ...(input.name !== undefined && { name: input.name }),
                ...(input.nickname !== undefined && { nickname: input.nickname }),
                ...(input.picture !== undefined && { picture: input.picture }),
                ...(input.verify_email !== undefined && { verify_email: input.verify_email }),
                ...(input.verify_phone_number !== undefined && { verify_phone_number: input.verify_phone_number }),
                ...(input.password !== undefined && { password: input.password }),
                ...(input.connection !== undefined && { connection: input.connection }),
                ...(input.client_id !== undefined && { client_id: input.client_id }),
                ...(input.username !== undefined && { username: input.username })
            },
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'User not found or update failed',
                user_id: input.user_id
            });
        }

        const user = OutputSchema.parse(response.data);

        return {
            user_id: user.user_id,
            ...(user.email !== undefined && { email: user.email }),
            ...(user.email_verified !== undefined && { email_verified: user.email_verified }),
            ...(user.username !== undefined && { username: user.username }),
            ...(user.phone_number !== undefined && { phone_number: user.phone_number }),
            ...(user.phone_verified !== undefined && { phone_verified: user.phone_verified }),
            ...(user.name !== undefined && { name: user.name }),
            ...(user.nickname !== undefined && { nickname: user.nickname }),
            ...(user.picture !== undefined && { picture: user.picture }),
            ...(user.blocked !== undefined && { blocked: user.blocked }),
            ...(user.given_name !== undefined && { given_name: user.given_name }),
            ...(user.family_name !== undefined && { family_name: user.family_name }),
            ...(user.created_at !== undefined && { created_at: user.created_at }),
            ...(user.updated_at !== undefined && { updated_at: user.updated_at }),
            ...(user.user_metadata !== undefined && { user_metadata: user.user_metadata }),
            ...(user.app_metadata !== undefined && { app_metadata: user.app_metadata })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
