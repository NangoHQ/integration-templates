import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    user_id: z.string().describe('The ID of the user to update. Example: "12345"'),
    name: z.string().max(50).optional().describe('The name of the user.'),
    login: z.string().optional().describe('The email address the user uses to log in.'),
    role: z.enum(['coadmin', 'user']).optional().describe("The user's enterprise role."),
    language: z.string().optional().describe('The language of the user in ISO 639-1 format.'),
    is_sync_enabled: z.boolean().optional().describe('Whether the user can use Box Sync.'),
    job_title: z.string().max(100).optional().describe("The user's job title."),
    phone: z.string().max(100).optional().describe("The user's phone number."),
    address: z.string().max(255).optional().describe("The user's address."),
    can_see_managed_users: z.boolean().optional().describe('Whether the user can see other enterprise users in their contact list.'),
    timezone: z.string().optional().describe("The user's timezone."),
    is_external_collab_restricted: z.boolean().optional().describe('Whether the user is allowed to collaborate with users outside their enterprise.'),
    is_exempt_from_device_limits: z.boolean().optional().describe('Whether to exempt the user from enterprise device limits.'),
    is_exempt_from_login_verification: z.boolean().optional().describe('Whether the user must use two-factor authentication.'),
    is_password_reset_required: z.boolean().optional().describe('Whether the user is required to reset their password.'),
    status: z.enum(['active', 'inactive', 'cannot_delete_edit', 'cannot_delete_edit_upload']).optional().describe("The user's account status."),
    space_amount: z.number().int().optional().describe("The user's total available space in bytes. Set to -1 for unlimited storage."),
    external_app_user_id: z.string().optional().describe('An external identifier for an app user.')
});

const ProviderUserSchema = z.object({
    id: z.string(),
    type: z.enum(['user']),
    name: z.string().optional(),
    login: z.string().optional(),
    role: z.enum(['admin', 'coadmin', 'user']).optional(),
    language: z.string().optional(),
    timezone: z.string().optional(),
    space_amount: z.number().int().optional(),
    space_used: z.number().int().optional(),
    max_upload_size: z.number().int().optional(),
    status: z.enum(['active', 'inactive', 'cannot_delete_edit', 'cannot_delete_edit_upload']).optional(),
    job_title: z.string().optional(),
    phone: z.string().optional(),
    address: z.string().optional(),
    avatar_url: z.string().optional(),
    is_sync_enabled: z.boolean().optional(),
    can_see_managed_users: z.boolean().optional(),
    is_external_collab_restricted: z.boolean().optional(),
    is_exempt_from_device_limits: z.boolean().optional(),
    is_exempt_from_login_verification: z.boolean().optional(),
    is_platform_access_only: z.boolean().optional(),
    external_app_user_id: z.string().optional(),
    created_at: z.string().optional(),
    modified_at: z.string().optional()
});

const OutputSchema = z.object({
    id: z.string(),
    type: z.enum(['user']),
    name: z.string().optional(),
    login: z.string().optional(),
    role: z.enum(['admin', 'coadmin', 'user']).optional(),
    language: z.string().optional(),
    timezone: z.string().optional(),
    space_amount: z.number().int().optional(),
    space_used: z.number().int().optional(),
    max_upload_size: z.number().int().optional(),
    status: z.enum(['active', 'inactive', 'cannot_delete_edit', 'cannot_delete_edit_upload']).optional(),
    job_title: z.string().optional(),
    phone: z.string().optional(),
    address: z.string().optional(),
    avatar_url: z.string().optional(),
    is_sync_enabled: z.boolean().optional(),
    can_see_managed_users: z.boolean().optional(),
    is_external_collab_restricted: z.boolean().optional(),
    is_exempt_from_device_limits: z.boolean().optional(),
    is_exempt_from_login_verification: z.boolean().optional(),
    is_platform_access_only: z.boolean().optional(),
    external_app_user_id: z.string().optional(),
    created_at: z.string().optional(),
    modified_at: z.string().optional()
});

const action = createAction({
    description: 'Update a user in Box',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['manage_managed_users'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const updateData: Record<string, unknown> = {};

        if (input.name !== undefined) {
            updateData['name'] = input.name;
        }
        if (input.login !== undefined) {
            updateData['login'] = input.login;
        }
        if (input.role !== undefined) {
            updateData['role'] = input.role;
        }
        if (input.language !== undefined) {
            updateData['language'] = input.language;
        }
        if (input.is_sync_enabled !== undefined) {
            updateData['is_sync_enabled'] = input.is_sync_enabled;
        }
        if (input.job_title !== undefined) {
            updateData['job_title'] = input.job_title;
        }
        if (input.phone !== undefined) {
            updateData['phone'] = input.phone;
        }
        if (input.address !== undefined) {
            updateData['address'] = input.address;
        }
        if (input.can_see_managed_users !== undefined) {
            updateData['can_see_managed_users'] = input.can_see_managed_users;
        }
        if (input.timezone !== undefined) {
            updateData['timezone'] = input.timezone;
        }
        if (input.is_external_collab_restricted !== undefined) {
            updateData['is_external_collab_restricted'] = input.is_external_collab_restricted;
        }
        if (input.is_exempt_from_device_limits !== undefined) {
            updateData['is_exempt_from_device_limits'] = input.is_exempt_from_device_limits;
        }
        if (input.is_exempt_from_login_verification !== undefined) {
            updateData['is_exempt_from_login_verification'] = input.is_exempt_from_login_verification;
        }
        if (input.is_password_reset_required !== undefined) {
            updateData['is_password_reset_required'] = input.is_password_reset_required;
        }
        if (input.status !== undefined) {
            updateData['status'] = input.status;
        }
        if (input.space_amount !== undefined) {
            updateData['space_amount'] = input.space_amount;
        }
        if (input.external_app_user_id !== undefined) {
            updateData['external_app_user_id'] = input.external_app_user_id;
        }

        if (Object.keys(updateData).length === 0) {
            throw new nango.ActionError({
                type: 'invalid_input',
                message: 'At least one field to update must be provided.'
            });
        }

        // https://developer.box.com/reference/put-users-id/
        const response = await nango.put({
            endpoint: `/2.0/users/${input.user_id}`,
            data: updateData,
            retries: 3
        });

        const providerUser = ProviderUserSchema.parse(response.data);

        return {
            id: providerUser.id,
            type: providerUser.type,
            ...(providerUser.name !== undefined && { name: providerUser.name }),
            ...(providerUser.login !== undefined && { login: providerUser.login }),
            ...(providerUser.role !== undefined && { role: providerUser.role }),
            ...(providerUser.language !== undefined && { language: providerUser.language }),
            ...(providerUser.timezone !== undefined && { timezone: providerUser.timezone }),
            ...(providerUser.space_amount !== undefined && { space_amount: providerUser.space_amount }),
            ...(providerUser.space_used !== undefined && { space_used: providerUser.space_used }),
            ...(providerUser.max_upload_size !== undefined && { max_upload_size: providerUser.max_upload_size }),
            ...(providerUser.status !== undefined && { status: providerUser.status }),
            ...(providerUser.job_title !== undefined && { job_title: providerUser.job_title }),
            ...(providerUser.phone !== undefined && { phone: providerUser.phone }),
            ...(providerUser.address !== undefined && { address: providerUser.address }),
            ...(providerUser.avatar_url !== undefined && { avatar_url: providerUser.avatar_url }),
            ...(providerUser.is_sync_enabled !== undefined && { is_sync_enabled: providerUser.is_sync_enabled }),
            ...(providerUser.can_see_managed_users !== undefined && { can_see_managed_users: providerUser.can_see_managed_users }),
            ...(providerUser.is_external_collab_restricted !== undefined && { is_external_collab_restricted: providerUser.is_external_collab_restricted }),
            ...(providerUser.is_exempt_from_device_limits !== undefined && { is_exempt_from_device_limits: providerUser.is_exempt_from_device_limits }),
            ...(providerUser.is_exempt_from_login_verification !== undefined && {
                is_exempt_from_login_verification: providerUser.is_exempt_from_login_verification
            }),
            ...(providerUser.is_platform_access_only !== undefined && { is_platform_access_only: providerUser.is_platform_access_only }),
            ...(providerUser.external_app_user_id !== undefined && { external_app_user_id: providerUser.external_app_user_id }),
            ...(providerUser.created_at !== undefined && { created_at: providerUser.created_at }),
            ...(providerUser.modified_at !== undefined && { modified_at: providerUser.modified_at })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
