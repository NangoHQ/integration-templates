import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

// Full refresh on every run. Timely's list endpoints accept `updated_since` but silently
// ignore it (verified live against events/projects/clients), so there is no working
// incremental filter for users. The endpoint returns a bare JSON array in a single
// response with no confirmed pagination mechanism (`page`/`per_page` are accepted but
// have no observable effect), so there is no pagination cursor or resume state to store.
// Removal detection is handled with trackDeletesStart/trackDeletesEnd.

const ProviderAvatarSchema = z.object({
    large_retina: z.string().optional(),
    large: z.string().optional(),
    medium_retina: z.string().optional(),
    medium: z.string().optional(),
    small_retina: z.string().optional(),
    small: z.string().optional()
});

const ProviderRoleSchema = z.object({
    id: z.number(),
    name: z.string()
});

const ProviderUserSchema = z.object({
    id: z.number(),
    email: z.string(),
    name: z.string(),
    active: z.boolean(),
    day_view_onboarded: z.boolean().optional(),
    memory_onboarded: z.boolean().optional(),
    created_at: z.number().optional(),
    updated_at: z.number().optional(),
    last_received_memories_date: z.string().nullable().optional(),
    sign_in_count: z.number().optional(),
    external_id: z.string().nullable().optional(),
    time_zone: z.string().optional(),
    memory_retention_days: z.number().nullable().optional(),
    avatar: ProviderAvatarSchema.nullable().optional(),
    type: z.string().optional(),
    work_days: z.string().optional(),
    weekdays: z.string().optional(),
    weekly_capacity: z.number().optional(),
    user_level: z.string().optional(),
    admin: z.boolean().optional(),
    hide_hourly_rate: z.boolean().optional(),
    hide_internal_hourly_rate: z.boolean().optional(),
    deleted: z.boolean().optional(),
    default_hour_rate: z.number().optional(),
    internal_hour_rate: z.number().optional(),
    role_id: z.number().optional(),
    role: ProviderRoleSchema.nullable().optional()
});

const ProviderUsersSchema = z.array(ProviderUserSchema);

const ProviderAccountSchema = z.object({
    id: z.number(),
    name: z.string().optional()
});

const ProviderAccountsSchema = z.array(ProviderAccountSchema);

const AvatarSchema = z.object({
    large_retina: z.string().optional().describe('URL of the large retina avatar image.'),
    large: z.string().optional().describe('URL of the large avatar image.'),
    medium_retina: z.string().optional().describe('URL of the medium retina avatar image.'),
    medium: z.string().optional().describe('URL of the medium avatar image.'),
    small_retina: z.string().optional().describe('URL of the small retina avatar image.'),
    small: z.string().optional().describe('URL of the small avatar image.')
});

const RoleSchema = z.object({
    id: z.number().describe('ID of the role assigned to the user.'),
    name: z.string().describe("Name of the role (e.g. 'admin').")
});

const UserSchema = z
    .object({
        id: z.string().describe('Unique Timely user (team member) ID.'),
        email: z.string().describe('Email address the user signs in to Timely with.'),
        name: z.string().describe('Full display name of the user.'),
        active: z.boolean().describe('Whether the user account is currently active.'),
        admin: z.boolean().optional().describe('Whether the user is an account administrator.'),
        user_level: z.string().optional().describe("User's permission level (e.g. 'admin')."),
        type: z.string().optional().describe("Resource type, always 'User'."),
        created_at: z.number().optional().describe('Unix timestamp (seconds) when the user was created.'),
        updated_at: z.number().optional().describe('Unix timestamp (seconds) when the user was last updated.'),
        sign_in_count: z.number().optional().describe('Total number of times the user has signed in.'),
        time_zone: z.string().optional().describe("Time zone configured for the user (e.g. 'Africa/Nairobi')."),
        work_days: z.string().optional().describe('Comma-separated list of the days of the week the user works (e.g. MON,TUE,WED,THU,FRI).'),
        weekdays: z.string().optional().describe("Comma-separated two-letter codes of the user's working weekdays (e.g. MO,TU,WE,TH,FR)."),
        weekly_capacity: z.number().optional().describe('Weekly working capacity of the user in hours.'),
        default_hour_rate: z.number().optional().describe('Default billable hourly rate applied to the user.'),
        internal_hour_rate: z.number().optional().describe('Internal (cost) hourly rate applied to the user.'),
        hide_hourly_rate: z.boolean().optional().describe('Whether the billable hourly rate is hidden for the user.'),
        hide_internal_hourly_rate: z.boolean().optional().describe('Whether the internal hourly rate is hidden for the user.'),
        role_id: z.number().optional().describe('ID of the role assigned to the user.'),
        role: RoleSchema.optional().describe('Role assigned to the user.'),
        avatar: AvatarSchema.optional().describe('Avatar image URLs for the user.'),
        day_view_onboarded: z.boolean().optional().describe('Whether the user has completed the day-view onboarding flow.'),
        memory_onboarded: z.boolean().optional().describe('Whether the user has completed the memories onboarding flow.'),
        external_id: z.string().optional().describe('External identifier for the user, when one has been set.'),
        last_received_memories_date: z.string().optional().describe('Date the user last received memories, when any exist.'),
        memory_retention_days: z.number().optional().describe('Number of days of memories retained for the user, when a limit is set.'),
        deleted: z.boolean().optional().describe('Whether the user is marked as deleted in Timely.')
    })
    .describe('A Timely user (a team member in the account).');

const sync = createSync({
    description: 'Sync all users (team members) in the account.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    models: {
        User: UserSchema
    },

    exec: async (nango) => {
        const accountsConfig: ProxyConfiguration = {
            // https://developer.timely.com/
            endpoint: '/1.1/accounts',
            retries: 3
        };
        const accountsResponse = await nango.get(accountsConfig);
        const accounts = ProviderAccountsSchema.parse(accountsResponse.data);

        const account = accounts[0];
        if (!account) {
            throw new Error('No Timely account is accessible for this connection');
        }

        // Safe to call every execution after prerequisites resolve: it opens (or reuses)
        // the delete-tracking window without overwriting an already-open one.
        await nango.trackDeletesStart('User');

        const accountId = encodeURIComponent(String(account.id));
        const usersConfig: ProxyConfiguration = {
            // https://developer.timely.com/
            endpoint: `/1.1/${accountId}/users`,
            retries: 3
        };
        const usersResponse = await nango.get(usersConfig);
        const users = ProviderUsersSchema.parse(usersResponse.data);

        const mappedUsers = users.map((user) => ({
            id: String(user.id),
            email: user.email,
            name: user.name,
            active: user.active,
            ...(user.admin !== undefined && { admin: user.admin }),
            ...(user.user_level !== undefined && { user_level: user.user_level }),
            ...(user.type !== undefined && { type: user.type }),
            ...(user.created_at !== undefined && { created_at: user.created_at }),
            ...(user.updated_at !== undefined && { updated_at: user.updated_at }),
            ...(user.sign_in_count !== undefined && { sign_in_count: user.sign_in_count }),
            ...(user.time_zone !== undefined && { time_zone: user.time_zone }),
            ...(user.work_days !== undefined && { work_days: user.work_days }),
            ...(user.weekdays !== undefined && { weekdays: user.weekdays }),
            ...(user.weekly_capacity !== undefined && { weekly_capacity: user.weekly_capacity }),
            ...(user.default_hour_rate !== undefined && { default_hour_rate: user.default_hour_rate }),
            ...(user.internal_hour_rate !== undefined && { internal_hour_rate: user.internal_hour_rate }),
            ...(user.hide_hourly_rate !== undefined && { hide_hourly_rate: user.hide_hourly_rate }),
            ...(user.hide_internal_hourly_rate !== undefined && { hide_internal_hourly_rate: user.hide_internal_hourly_rate }),
            ...(user.role_id !== undefined && { role_id: user.role_id }),
            ...(user.role != null && { role: user.role }),
            ...(user.avatar != null && { avatar: user.avatar }),
            ...(user.day_view_onboarded !== undefined && { day_view_onboarded: user.day_view_onboarded }),
            ...(user.memory_onboarded !== undefined && { memory_onboarded: user.memory_onboarded }),
            ...(user.external_id != null && { external_id: user.external_id }),
            ...(user.last_received_memories_date != null && { last_received_memories_date: user.last_received_memories_date }),
            ...(user.memory_retention_days != null && { memory_retention_days: user.memory_retention_days }),
            ...(user.deleted !== undefined && { deleted: user.deleted })
        }));

        if (mappedUsers.length > 0) {
            await nango.batchSave(mappedUsers, 'User');
        }

        // Close the delete-tracking window only on the success path so that anything
        // removed from the account since the previous run is soft-deleted.
        await nango.trackDeletesEnd('User');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
