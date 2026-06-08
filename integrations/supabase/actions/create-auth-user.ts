import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    email: z.string().email(),
    password: z.string().optional(),
    phone: z.string().optional(),
    email_confirm: z.boolean().optional(),
    phone_confirm: z.boolean().optional(),
    user_metadata: z.record(z.string(), z.unknown()).optional(),
    app_metadata: z.record(z.string(), z.unknown()).optional()
});

const ProviderUserSchema = z.object({
    id: z.string(),
    aud: z.string().optional(),
    role: z.string().optional(),
    email: z.string().email().optional().nullable(),
    phone: z.string().optional().nullable(),
    email_confirmed_at: z.string().optional().nullable(),
    phone_confirmed_at: z.string().optional().nullable(),
    last_sign_in_at: z.string().optional().nullable(),
    created_at: z.string(),
    updated_at: z.string(),
    identities: z
        .array(
            z.object({
                id: z.string(),
                user_id: z.string(),
                identity_data: z.record(z.string(), z.unknown()).optional(),
                provider: z.string().optional(),
                created_at: z.string().optional(),
                updated_at: z.string().optional()
            })
        )
        .optional()
        .nullable(),
    user_metadata: z.record(z.string(), z.unknown()).optional().nullable(),
    app_metadata: z.record(z.string(), z.unknown()).optional().nullable()
});

const OutputSchema = z.object({
    id: z.string(),
    email: z.string().email().optional(),
    phone: z.string().optional(),
    email_confirmed_at: z.string().optional(),
    phone_confirmed_at: z.string().optional(),
    last_sign_in_at: z.string().optional(),
    created_at: z.string(),
    updated_at: z.string(),
    identities: z
        .array(
            z.object({
                id: z.string(),
                user_id: z.string(),
                identity_data: z.record(z.string(), z.unknown()).optional(),
                provider: z.string().optional(),
                created_at: z.string().optional(),
                updated_at: z.string().optional()
            })
        )
        .optional(),
    user_metadata: z.record(z.string(), z.unknown()).optional(),
    app_metadata: z.record(z.string(), z.unknown()).optional()
});

const action = createAction({
    description: 'Create an auth user in Supabase.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/create-auth-user',
        group: 'Auth'
    },
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const connection = await nango.getConnection();
        const projectUrl = connection.connection_config?.['projectUrl'];
        const baseUrlOverride = typeof projectUrl === 'string' && projectUrl.startsWith('http') ? projectUrl : undefined;

        // https://supabase.com/docs/reference/api/admin-create-user
        const response = await nango.post({
            endpoint: '/auth/v1/admin/users',
            baseUrlOverride,
            data: {
                email: input.email,
                ...(input.password !== undefined && { password: input.password }),
                ...(input.phone !== undefined && { phone: input.phone }),
                ...(input.email_confirm !== undefined && { email_confirm: input.email_confirm }),
                ...(input.phone_confirm !== undefined && { phone_confirm: input.phone_confirm }),
                ...(input.user_metadata !== undefined && { user_metadata: input.user_metadata }),
                ...(input.app_metadata !== undefined && { app_metadata: input.app_metadata })
            },
            retries: 3
        });

        const providerUser = ProviderUserSchema.parse(response.data);

        return {
            id: providerUser.id,
            created_at: providerUser.created_at,
            updated_at: providerUser.updated_at,
            ...(providerUser.email != null && { email: providerUser.email }),
            ...(providerUser.phone != null && { phone: providerUser.phone }),
            ...(providerUser.email_confirmed_at != null && { email_confirmed_at: providerUser.email_confirmed_at }),
            ...(providerUser.phone_confirmed_at != null && { phone_confirmed_at: providerUser.phone_confirmed_at }),
            ...(providerUser.last_sign_in_at != null && { last_sign_in_at: providerUser.last_sign_in_at }),
            ...(providerUser.identities != null && { identities: providerUser.identities }),
            ...(providerUser.user_metadata != null && { user_metadata: providerUser.user_metadata }),
            ...(providerUser.app_metadata != null && { app_metadata: providerUser.app_metadata })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
