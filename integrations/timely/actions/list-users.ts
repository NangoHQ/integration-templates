import { z } from 'zod';
import { createAction, type ProxyConfiguration } from 'nango';

const InputSchema = z
    .object({
        account_id: z.number().int().positive().describe('Timely account ID. Example: 1145787. Discover it with the list-accounts action.')
    })
    .describe('Input for listing the users in a Timely account.');

const AvatarSchema = z.object({
    large_retina: z.string().optional().describe('URL of the large retina avatar image.'),
    large: z.string().optional().describe('URL of the large avatar image.'),
    medium_retina: z.string().optional().describe('URL of the medium retina avatar image.'),
    medium: z.string().optional().describe('URL of the medium avatar image.'),
    small_retina: z.string().optional().describe('URL of the small retina avatar image.'),
    small: z.string().optional().describe('URL of the small avatar image.')
});

const RoleSchema = z.object({
    id: z.number().describe('Numeric ID of the user role.'),
    name: z.string().describe('Name of the user role, such as "admin".')
});

const ProviderUserSchema = z.object({
    id: z.number(),
    email: z.string(),
    name: z.string(),
    active: z.boolean(),
    time_zone: z.string().nullable().optional(),
    avatar: AvatarSchema.nullable().optional(),
    type: z.string().nullable().optional(),
    user_level: z.string().nullable().optional(),
    admin: z.boolean().nullable().optional(),
    deleted: z.boolean().nullable().optional(),
    weekly_capacity: z.number().nullable().optional(),
    default_hour_rate: z.number().nullable().optional(),
    internal_hour_rate: z.number().nullable().optional(),
    role_id: z.number().nullable().optional(),
    role: RoleSchema.nullable().optional(),
    created_at: z.number().nullable().optional(),
    updated_at: z.number().nullable().optional()
});

const UserSchema = z.object({
    id: z.number().describe('Numeric ID of the user.'),
    email: z.string().describe('Email address of the user.'),
    name: z.string().describe('Display name of the user.'),
    active: z.boolean().describe('Whether the user account is active.'),
    time_zone: z.string().optional().describe('IANA time zone of the user, such as "Africa/Nairobi".'),
    avatar: AvatarSchema.optional().describe('Avatar image URLs for the user.'),
    type: z.string().optional().describe('Provider object type, typically "User".'),
    user_level: z.string().optional().describe('Permission level of the user, such as "admin".'),
    admin: z.boolean().optional().describe('Whether the user is an account administrator.'),
    deleted: z.boolean().optional().describe('Whether the user has been deleted.'),
    weekly_capacity: z.number().optional().describe('Weekly working capacity in hours.'),
    default_hour_rate: z.number().optional().describe('Default billable hourly rate for the user.'),
    internal_hour_rate: z.number().optional().describe('Internal hourly cost rate for the user.'),
    role_id: z.number().optional().describe('Numeric ID of the user role.'),
    role: RoleSchema.optional().describe('Role assigned to the user.'),
    created_at: z.number().optional().describe('Unix timestamp (seconds) when the user was created.'),
    updated_at: z.number().optional().describe('Unix timestamp (seconds) when the user was last updated.')
});

const OutputSchema = z
    .object({
        users: z.array(UserSchema).describe('Team members in the account.')
    })
    .describe('Response containing the team members in the account.');

/**
 * @tags: [read]
 * @tagReason: Lists team members from the provider and does not mutate any provider state.
 * @pitfalls: Results are scoped to the single account_id supplied; there is no "current user" shortcut, so resolve your own identity by matching against this list.
 */
const action = createAction({
    description: 'List all users (team members) in the account.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://developer.timely.com/ (Timely API: GET /1.1/{account_id}/users)
            endpoint: `/1.1/${input.account_id}/users`,
            retries: 3
        };

        const response = await nango.get(config);

        const providerUsers = z.array(ProviderUserSchema).parse(response.data);

        const users = providerUsers.map((user) => ({
            id: user.id,
            email: user.email,
            name: user.name,
            active: user.active,
            ...(user.time_zone != null && { time_zone: user.time_zone }),
            ...(user.avatar != null && { avatar: user.avatar }),
            ...(user.type != null && { type: user.type }),
            ...(user.user_level != null && { user_level: user.user_level }),
            ...(user.admin != null && { admin: user.admin }),
            ...(user.deleted != null && { deleted: user.deleted }),
            ...(user.weekly_capacity != null && { weekly_capacity: user.weekly_capacity }),
            ...(user.default_hour_rate != null && { default_hour_rate: user.default_hour_rate }),
            ...(user.internal_hour_rate != null && { internal_hour_rate: user.internal_hour_rate }),
            ...(user.role_id != null && { role_id: user.role_id }),
            ...(user.role != null && { role: user.role }),
            ...(user.created_at != null && { created_at: user.created_at }),
            ...(user.updated_at != null && { updated_at: user.updated_at })
        }));

        return { users };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
