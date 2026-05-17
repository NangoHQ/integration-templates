import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    name: z.string().describe('The full name of the user. Example: "Jane Doe"'),
    login: z.string().describe('The email address the user uses to log in. Example: "jane@example.com"'),
    role: z.enum(['coadmin', 'user']).optional().describe("The user's enterprise role."),
    language: z.string().optional().describe('The language of the user in ISO 639-1 format.'),
    is_sync_enabled: z.boolean().optional().describe('Whether the user can use Box Sync.'),
    job_title: z.string().optional().describe("The user's job title."),
    phone: z.string().optional().describe("The user's phone number."),
    address: z.string().optional().describe("The user's address."),
    space_amount: z.number().int().optional().describe("The user's total available space in bytes."),
    can_see_managed_users: z.boolean().optional().describe('Whether the user can see other enterprise users in their contact list.'),
    timezone: z.string().optional().describe("The user's timezone."),
    is_external_collab_restricted: z.boolean().optional().describe('Whether the user is restricted from collaborating with users outside their enterprise.'),
    is_exempt_from_device_limits: z.boolean().optional().describe('Whether to exempt the user from enterprise device limits.'),
    is_exempt_from_login_verification: z.boolean().optional().describe('Whether the user must use two-factor authentication.'),
    is_platform_access_only: z.boolean().optional().describe('Whether the user is an App User.'),
    status: z.enum(['active', 'inactive', 'cannot_delete_edit', 'cannot_delete_edit_upload']).optional().describe("The user's account status."),
    external_app_user_id: z.string().optional().describe('An external identifier for an app user.'),
    tracking_codes: z
        .array(
            z.object({
                type: z.literal('tracking_code').optional(),
                name: z.string().optional(),
                value: z.string().optional()
            })
        )
        .optional()
        .describe('Tracking codes for analytics purposes.')
});

const ProviderUserSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    login: z.string().optional(),
    role: z.string().optional(),
    language: z.string().optional(),
    timezone: z.string().optional(),
    space_amount: z.number().optional(),
    space_used: z.number().optional(),
    max_upload_size: z.number().optional(),
    status: z.string().optional(),
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
    name: z.string().optional(),
    login: z.string().optional(),
    role: z.string().optional(),
    language: z.string().optional(),
    timezone: z.string().optional(),
    space_amount: z.number().optional(),
    space_used: z.number().optional(),
    max_upload_size: z.number().optional(),
    status: z.string().optional(),
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
    description: 'Creates a user in Box. Requires an enterprise account.',
    version: '3.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/create-user',
        group: 'Users'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['manage_managed_users'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const createData: Record<string, unknown> = {
            name: input.name,
            login: input.login
        };

        if (input.role !== undefined) createData['role'] = input.role;
        if (input.language !== undefined) createData['language'] = input.language;
        if (input.is_sync_enabled !== undefined) createData['is_sync_enabled'] = input.is_sync_enabled;
        if (input.job_title !== undefined) createData['job_title'] = input.job_title;
        if (input.phone !== undefined) createData['phone'] = input.phone;
        if (input.address !== undefined) createData['address'] = input.address;
        if (input.space_amount !== undefined) createData['space_amount'] = input.space_amount;
        if (input.can_see_managed_users !== undefined) createData['can_see_managed_users'] = input.can_see_managed_users;
        if (input.timezone !== undefined) createData['timezone'] = input.timezone;
        if (input.is_external_collab_restricted !== undefined) createData['is_external_collab_restricted'] = input.is_external_collab_restricted;
        if (input.is_exempt_from_device_limits !== undefined) createData['is_exempt_from_device_limits'] = input.is_exempt_from_device_limits;
        if (input.is_exempt_from_login_verification !== undefined) createData['is_exempt_from_login_verification'] = input.is_exempt_from_login_verification;
        if (input.is_platform_access_only !== undefined) createData['is_platform_access_only'] = input.is_platform_access_only;
        if (input.status !== undefined) createData['status'] = input.status;
        if (input.external_app_user_id !== undefined) createData['external_app_user_id'] = input.external_app_user_id;
        if (input.tracking_codes !== undefined) createData['tracking_codes'] = input.tracking_codes;

        // https://developer.box.com/reference/post-users/
        const response = await nango.post({
            endpoint: '/2.0/users',
            data: createData,
            retries: 3
        });

        const user = ProviderUserSchema.parse(response.data);

        return {
            id: user.id,
            ...(user.name !== undefined && { name: user.name }),
            ...(user.login !== undefined && { login: user.login }),
            ...(user.role !== undefined && { role: user.role }),
            ...(user.language !== undefined && { language: user.language }),
            ...(user.timezone !== undefined && { timezone: user.timezone }),
            ...(user.space_amount !== undefined && { space_amount: user.space_amount }),
            ...(user.space_used !== undefined && { space_used: user.space_used }),
            ...(user.max_upload_size !== undefined && { max_upload_size: user.max_upload_size }),
            ...(user.status !== undefined && { status: user.status }),
            ...(user.job_title !== undefined && { job_title: user.job_title }),
            ...(user.phone !== undefined && { phone: user.phone }),
            ...(user.address !== undefined && { address: user.address }),
            ...(user.avatar_url !== undefined && { avatar_url: user.avatar_url }),
            ...(user.is_sync_enabled !== undefined && { is_sync_enabled: user.is_sync_enabled }),
            ...(user.can_see_managed_users !== undefined && { can_see_managed_users: user.can_see_managed_users }),
            ...(user.is_external_collab_restricted !== undefined && { is_external_collab_restricted: user.is_external_collab_restricted }),
            ...(user.is_exempt_from_device_limits !== undefined && { is_exempt_from_device_limits: user.is_exempt_from_device_limits }),
            ...(user.is_exempt_from_login_verification !== undefined && { is_exempt_from_login_verification: user.is_exempt_from_login_verification }),
            ...(user.is_platform_access_only !== undefined && { is_platform_access_only: user.is_platform_access_only }),
            ...(user.external_app_user_id !== undefined && { external_app_user_id: user.external_app_user_id }),
            ...(user.created_at !== undefined && { created_at: user.created_at }),
            ...(user.modified_at !== undefined && { modified_at: user.modified_at })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
