import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    user_id: z.string().describe('The unique ID of the user to update. Example: "a02e344e-4eba-473d-b299-b751cbd1fa2c"'),
    email: z.string().email().optional().describe('New email address for the user.'),
    phone: z.string().optional().describe('New phone number for the user.'),
    password: z.string().optional().describe('New password for the user.'),
    email_confirm: z.boolean().optional().describe("Confirm the user's email address."),
    phone_confirm: z.boolean().optional().describe("Confirm the user's phone number."),
    user_metadata: z.record(z.string(), z.unknown()).optional().describe('User-specific metadata.'),
    app_metadata: z.record(z.string(), z.unknown()).optional().describe('Application-specific metadata.'),
    ban_duration: z.string().optional().describe('Ban duration in hours. Example: "876600h".')
});

const ProviderIdentitySchema = z.object({
    id: z.string(),
    user_id: z.string(),
    identity_data: z.record(z.string(), z.unknown()).optional(),
    provider: z.string(),
    created_at: z.string().optional(),
    updated_at: z.string().optional(),
    last_sign_in_at: z.string().optional()
});

const ProviderUserSchema = z.object({
    id: z.string(),
    aud: z.string().optional(),
    role: z.string().optional(),
    email: z.string().optional(),
    phone: z.string().nullable().optional(),
    email_confirmed_at: z.string().nullable().optional(),
    phone_confirmed_at: z.string().nullable().optional(),
    confirmation_sent_at: z.string().nullable().optional(),
    recovery_sent_at: z.string().nullable().optional(),
    new_email: z.string().nullable().optional(),
    email_change_sent_at: z.string().nullable().optional(),
    new_phone: z.string().nullable().optional(),
    phone_change_sent_at: z.string().nullable().optional(),
    invited_at: z.string().nullable().optional(),
    last_sign_in_at: z.string().nullable().optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional(),
    is_anonymous: z.boolean().optional(),
    user_metadata: z.record(z.string(), z.unknown()).optional(),
    app_metadata: z.record(z.string(), z.unknown()).optional(),
    identities: z.array(ProviderIdentitySchema).nullable().optional(),
    factors: z.unknown().optional(),
    banned_until: z.string().nullable().optional()
});

const OutputSchema = z.object({
    id: z.string(),
    email: z.string().optional(),
    phone: z.string().optional(),
    role: z.string().optional(),
    user_metadata: z.record(z.string(), z.unknown()).optional(),
    app_metadata: z.record(z.string(), z.unknown()).optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional(),
    last_sign_in_at: z.string().optional(),
    identities: z.array(ProviderIdentitySchema).optional()
});

const action = createAction({
    description: 'Update an auth user in Supabase.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/update-auth-user',
        group: 'Auth'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['service_role'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const connection = await nango.getConnection();
        const connectionConfig = connection.connection_config;
        const projectUrl =
            connectionConfig != null && typeof connectionConfig === 'object' && 'projectUrl' in connectionConfig ? connectionConfig['projectUrl'] : undefined;
        const baseUrlOverride = typeof projectUrl === 'string' ? (projectUrl.startsWith('http') ? projectUrl : `https://${projectUrl}`) : undefined;

        const updateBody: Record<string, unknown> = {};
        if (input.email !== undefined) updateBody['email'] = input.email;
        if (input.phone !== undefined) updateBody['phone'] = input.phone;
        if (input.password !== undefined) updateBody['password'] = input.password;
        if (input.email_confirm !== undefined) updateBody['email_confirm'] = input.email_confirm;
        if (input.phone_confirm !== undefined) updateBody['phone_confirm'] = input.phone_confirm;
        if (input.user_metadata !== undefined) updateBody['user_metadata'] = input.user_metadata;
        if (input.app_metadata !== undefined) updateBody['app_metadata'] = input.app_metadata;
        if (input.ban_duration !== undefined) updateBody['ban_duration'] = input.ban_duration;

        // https://supabase.com/docs/reference/api/auth-admin-updateuserbyid
        const response = await nango.put({
            endpoint: `/auth/v1/admin/users/${encodeURIComponent(input.user_id)}`,
            baseUrlOverride,
            data: updateBody,
            retries: 3
        });

        if (response.status === 404) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'User not found',
                user_id: input.user_id
            });
        }

        const providerUser = ProviderUserSchema.parse(response.data);

        return {
            id: providerUser.id,
            ...(providerUser.email !== undefined && { email: providerUser.email }),
            ...(providerUser.phone != null && { phone: providerUser.phone }),
            ...(providerUser.role !== undefined && { role: providerUser.role }),
            ...(providerUser.user_metadata !== undefined && { user_metadata: providerUser.user_metadata }),
            ...(providerUser.app_metadata !== undefined && { app_metadata: providerUser.app_metadata }),
            ...(providerUser.created_at !== undefined && { created_at: providerUser.created_at }),
            ...(providerUser.updated_at !== undefined && { updated_at: providerUser.updated_at }),
            ...(providerUser.last_sign_in_at != null && { last_sign_in_at: providerUser.last_sign_in_at }),
            ...(providerUser.identities !== null && providerUser.identities !== undefined && { identities: providerUser.identities })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
