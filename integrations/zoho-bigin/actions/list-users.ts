import { z } from 'zod';
import { createAction } from 'nango';

const IdNameSchema = z
    .object({
        id: z.string().nullable().optional().describe('Unique identifier of the referenced record.'),
        name: z.string().nullable().optional().describe('Display name of the referenced record.')
    })
    .passthrough()
    .describe('A lightweight reference (id + name) to a related role, profile or user.');

const ThemeTabSchema = z
    .object({
        font_color: z.string().nullable().optional().describe('Hex font color used on the tab.'),
        background: z.string().nullable().optional().describe('Hex background color used on the tab.')
    })
    .passthrough()
    .describe('Color settings for a single tab style in the user theme.');

const ThemeSchema = z
    .object({
        normal_tab: ThemeTabSchema.nullable().optional().describe('Styling for the normal (unselected) tab.'),
        selected_tab: ThemeTabSchema.nullable().optional().describe('Styling for the selected tab.'),
        new_background: z.unknown().nullable().optional().describe('Background applied to newly created records, when set.'),
        background: z.string().nullable().optional().describe('Hex background color of the user interface.'),
        screen: z.string().nullable().optional().describe('Screen layout mode for the theme.'),
        type: z.string().nullable().optional().describe('Theme type, for example "default".')
    })
    .passthrough()
    .describe('User interface theme settings for the user.');

const CustomizeInfoSchema = z
    .object({
        notes_desc: z.unknown().nullable().optional().describe('Custom notes description setting, when configured.'),
        show_right_panel: z.boolean().nullable().optional().describe('Whether the right panel is shown.'),
        bc_view: z.unknown().nullable().optional().describe('Blue/compact view setting, when configured.'),
        show_home: z.boolean().nullable().optional().describe('Whether the home page is shown.'),
        show_detail_view: z.boolean().nullable().optional().describe('Whether the detail view is shown by default.'),
        unpin_recent_item: z.unknown().nullable().optional().describe('Recently viewed item unpin setting, when configured.')
    })
    .passthrough()
    .describe('Per-user interface customization preferences.');

const UserSchema = z
    .object({
        id: z.string().describe('Unique user ID.'),
        full_name: z.string().nullable().optional().describe('Full display name of the user.'),
        first_name: z.string().nullable().optional().describe('First name of the user.'),
        last_name: z.string().nullable().optional().describe('Last name of the user.'),
        email: z.string().nullable().optional().describe('Email address of the user.'),
        mobile: z.string().nullable().optional().describe('Mobile phone number of the user.'),
        phone: z.string().nullable().optional().describe('Work phone number of the user.'),
        fax: z.string().nullable().optional().describe('Fax number of the user.'),
        website: z.string().nullable().optional().describe('Website associated with the user.'),
        zuid: z.string().nullable().optional().describe('Zoho-wide user ID (zuid) of the user.'),
        role: IdNameSchema.nullable().optional().describe('Role assigned to the user.'),
        profile: IdNameSchema.nullable().optional().describe('Profile assigned to the user.'),
        created_by: IdNameSchema.nullable().optional().describe('User who created this user record.'),
        Modified_By: IdNameSchema.nullable().optional().describe('User who last modified this user record.'),
        theme: ThemeSchema.nullable().optional().describe('Theme settings of the user.'),
        customize_info: CustomizeInfoSchema.nullable().optional().describe('Interface customization preferences of the user.'),
        status: z.string().nullable().optional().describe('Status of the user, for example "active" or "deleted".'),
        category: z.string().nullable().optional().describe('Category of the user, for example "regular_user".'),
        confirm: z.boolean().nullable().optional().describe('Whether the user account is confirmed.'),
        sandboxDeveloper: z.boolean().nullable().optional().describe('Whether the user is a sandbox developer.'),
        microsoft: z.boolean().nullable().optional().describe('Whether the user is associated with Microsoft.'),
        personal_account: z.boolean().nullable().optional().describe('Whether the user account is personal.'),
        Isonline: z.boolean().nullable().optional().describe('Whether the user is currently online.'),
        language: z.string().nullable().optional().describe('Preferred language of the user.'),
        locale: z.string().nullable().optional().describe('Locale or region setting of the user.'),
        country_locale: z.string().nullable().optional().describe('Country-specific locale of the user.'),
        time_zone: z.string().nullable().optional().describe('Time zone of the user.'),
        time_format: z.string().nullable().optional().describe('Preferred time format of the user.'),
        date_format: z.string().nullable().optional().describe('Preferred date format of the user.'),
        name_format: z.string().nullable().optional().describe('Preferred name format of the user.'),
        sort_order_preference: z.string().nullable().optional().describe('Preferred sort order of the user.'),
        decimal_separator: z.string().nullable().optional().describe('Decimal separator used for numeric values.'),
        number_separator: z.string().nullable().optional().describe('Thousands separator used for numeric values.'),
        default_tab_group: z.string().nullable().optional().describe('Default tab group for the user.'),
        alias: z.string().nullable().optional().describe('Alias of the user.'),
        signature: z.string().nullable().optional().describe('Email signature of the user.'),
        dob: z.string().nullable().optional().describe('Date of birth of the user.'),
        country: z.string().nullable().optional().describe('Country of the user.'),
        city: z.string().nullable().optional().describe('City where the user is located.'),
        state: z.string().nullable().optional().describe('State or province where the user is located.'),
        street: z.string().nullable().optional().describe('Street address of the user.'),
        zip: z.string().nullable().optional().describe('ZIP or postal code of the user.'),
        offset: z.number().int().nullable().optional().describe('Time zone offset of the user, in milliseconds.'),
        created_time: z.string().nullable().optional().describe('ISO 8601 timestamp when the user was created.'),
        Modified_Time: z.string().nullable().optional().describe('ISO 8601 timestamp of the user record last modification.'),
        $shift_effective_from: z.string().nullable().optional().describe('Effective date of the user shift, when configured.'),
        $current_shift: z.unknown().nullable().optional().describe('Details of the user current shift, when configured.'),
        $next_shift: z.unknown().nullable().optional().describe('Details of the user next shift, when configured.')
    })
    .passthrough()
    .describe('A Bigin user (team member) with profile, role and preferences.');

const InfoSchema = z
    .object({
        per_page: z.number().int().optional().describe('Maximum number of users returned per page.'),
        count: z.number().int().optional().describe('Number of users returned in this response.'),
        page: z.number().int().optional().describe('Page index of this response (1-based).'),
        more_records: z.boolean().optional().describe('Whether more users are available on a subsequent page.')
    })
    .passthrough()
    .describe('Pagination metadata for the returned list of users.');

const InputSchema = z
    .object({
        type: z
            .string()
            .optional()
            .describe(
                'Filter users by type. One of: AllUsers, ActiveUsers, DeactiveUsers, ConfirmedUsers, NotConfirmedUsers, DeletedUsers, ActiveConfirmedUsers, AdminUsers, ActiveConfirmedAdmins, CurrentUser. Omit to list all users.'
            ),
        page: z.number().int().positive().optional().describe('Page index to retrieve (1-based). Omit for the first page.'),
        per_page: z.number().int().positive().max(200).optional().describe('Number of users to return per page, between 1 and 200. Defaults to 200.')
    })
    .describe('Filters and pagination for listing Bigin users.');

const OutputSchema = z
    .object({
        users: z.array(UserSchema).describe('List of Bigin users (team members) matching the request.'),
        info: InfoSchema.optional().describe('Pagination metadata for the returned users, when provided by the provider.')
    })
    .describe('The list of Bigin users and pagination metadata.');

/**
 * @tags: [read]
 * @tagReason: Lists users from the provider through a read-only GET endpoint; it never mutates provider data.
 * @pitfalls: Only up to 200 users are returned per call, so page through with page/per_page to get the rest. type=AllUsers includes inactive users (use type=ActiveUsers for current members), and the type values are case-sensitive exact strings, including the intentionally misspelled DeactiveUsers.
 */
const action = createAction({
    description: 'List users (team members) in the Bigin org.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://www.bigin.com/developer/docs/apis/v2/get-users.html
            endpoint: '/bigin/v2/users',
            params: {
                ...(input.type !== undefined && { type: input.type }),
                ...(input.page !== undefined && { page: input.page }),
                ...(input.per_page !== undefined && { per_page: input.per_page })
            },
            retries: 3
        });

        if (!response.data) {
            return { users: [] };
        }

        const parsed = OutputSchema.parse(response.data);

        return {
            users: parsed.users,
            ...(parsed.info !== undefined && { info: parsed.info })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
