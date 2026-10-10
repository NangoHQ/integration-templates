import { z } from 'zod';
import { createAction } from 'nango';

const AvatarSchema = z.object({
    large_retina: z.string().describe('URL of the large retina avatar image.'),
    large: z.string().describe('URL of the large avatar image.'),
    medium_retina: z.string().describe('URL of the medium retina avatar image.'),
    medium: z.string().describe('URL of the medium avatar image.'),
    small_retina: z.string().describe('URL of the small retina avatar image.'),
    small: z.string().describe('URL of the small avatar image.')
});

const RoleSchema = z.object({
    id: z.number().describe('Unique ID of the role.'),
    name: z.string().describe('Name of the role, e.g. "admin".')
});

const InputSchema = z
    .object({
        account_id: z.number().int().describe('Timely account ID that owns the user. Discover it via list-accounts. Example: 1145787'),
        user_id: z.number().int().describe('ID of the user to retrieve. Example: 2418691')
    })
    .describe('Input for retrieving a single Timely user.');

const OutputSchema = z
    .object({
        id: z.number().describe('Unique Timely user ID.'),
        email: z.string().describe('Email address of the user.'),
        name: z.string().describe('Display name of the user.'),
        active: z.boolean().describe('Whether the user is currently active.'),
        day_view_onboarded: z.boolean().describe('Whether the user completed day-view onboarding.'),
        memory_onboarded: z.boolean().describe('Whether the user completed memory onboarding.'),
        created_at: z.number().nullable().optional().describe('Unix timestamp (seconds) when the user was created.'),
        updated_at: z.number().nullable().optional().describe('Unix timestamp (seconds) when the user was last updated.'),
        last_received_memories_date: z.string().nullable().describe('Date the user last received memories, or null if none.'),
        sign_in_count: z.number().describe('Number of times the user has signed in.'),
        external_id: z.string().nullable().describe('Identifier of the user in an external system, or null if not linked.'),
        time_zone: z.string().nullable().optional().describe('IANA time zone of the user, e.g. "Africa/Nairobi".'),
        memory_retention_days: z.number().nullable().describe('Memory retention period in days, or null if not set.'),
        avatar: AvatarSchema.nullable().optional().describe('Avatar image URLs for the user, or null if none.'),
        type: z.string().nullable().optional().describe('Resource type discriminator, e.g. "User".'),
        work_days: z.string().describe('Working days of the user, e.g. "MON,TUE,WED,THU,FRI".'),
        weekdays: z.string().describe('Working weekdays of the user, e.g. "MO,TU,WE,TH,FR".'),
        weekly_capacity: z.number().nullable().optional().describe('Weekly capacity of the user in hours.'),
        active_projects_count: z.number().optional().describe('Number of active projects the user is assigned to.'),
        user_level: z.string().nullable().optional().describe('Permission level of the user, e.g. "admin".'),
        admin: z.boolean().nullable().optional().describe('Whether the user is an account administrator.'),
        hide_hourly_rate: z.boolean().describe('Whether the user hourly rate is hidden from others.'),
        hide_internal_hourly_rate: z.boolean().describe('Whether the user internal hourly rate is hidden from others.'),
        deleted: z.boolean().nullable().optional().describe('Whether the user has been deleted.'),
        default_hour_rate: z.number().nullable().optional().describe('Default hourly rate of the user.'),
        internal_hour_rate: z.number().nullable().optional().describe('Internal hourly rate of the user.'),
        role_id: z.number().nullable().optional().describe('ID of the role assigned to the user.'),
        role: RoleSchema.nullable().optional().describe('Role assigned to the user, or null if none.')
    })
    .describe('A single Timely user.');

/**
 * @tags: [read]
 * @tagReason: Retrieves a single user from Timely without modifying any provider state.
 * @pitfalls: Timely has no current-user lookup, so callers must supply both the account ID and user ID and cannot resolve the connection's own user in a single call.
 */
const action = createAction({
    description: 'Retrieve a single Timely user by ID.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://developer.timely.com/ - GET /1.1/{account_id}/users/{user_id}
            endpoint: `/1.1/${encodeURIComponent(String(input.account_id))}/users/${encodeURIComponent(String(input.user_id))}`,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'User not found',
                user_id: input.user_id
            });
        }

        return OutputSchema.parse(response.data);
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
