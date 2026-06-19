import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    user_id: z.string().describe('The unique ID of the user to retrieve. Example: "4150868000000225013"')
});

const RoleSchema = z.object({
    name: z.string().optional(),
    id: z.string().optional()
});

const ProfileSchema = z.object({
    name: z.string().optional(),
    id: z.string().optional()
});

const UserRefSchema = z.object({
    name: z.string().optional(),
    id: z.string().optional()
});

const TerritorySchema = z.object({
    manager: z.boolean().optional(),
    name: z.string().optional(),
    id: z.string().optional()
});

const ThemeSchema = z
    .object({
        normal_tab: z
            .object({
                font_color: z.string().optional(),
                background: z.string().optional()
            })
            .optional(),
        selected_tab: z
            .object({
                font_color: z.string().optional(),
                background: z.string().optional()
            })
            .optional(),
        new_background: z.string().nullable().optional(),
        background: z.string().optional(),
        screen: z.string().optional(),
        type: z.string().optional()
    })
    .optional();

const CustomizeInfoSchema = z
    .object({
        notes_desc: z.string().nullable().optional(),
        show_right_panel: z.boolean().nullable().optional(),
        bc_view: z.boolean().nullable().optional(),
        show_home: z.boolean().optional(),
        show_detail_view: z.boolean().optional(),
        unpin_recent_item: z.boolean().nullable().optional()
    })
    .optional();

const ProviderUserSchema = z
    .object({
        id: z.string(),
        first_name: z.string().nullable().optional(),
        last_name: z.string().nullable().optional(),
        full_name: z.string().nullable().optional(),
        email: z.string().nullable().optional(),
        status: z.string().optional(),
        role: RoleSchema.optional(),
        profile: ProfileSchema.optional(),
        phone: z.string().nullable().optional(),
        mobile: z.string().nullable().optional(),
        fax: z.string().nullable().optional(),
        street: z.string().nullable().optional(),
        city: z.string().nullable().optional(),
        state: z.string().nullable().optional(),
        zip: z.string().nullable().optional(),
        country: z.string().nullable().optional(),
        country_locale: z.string().nullable().optional(),
        website: z.string().nullable().optional(),
        time_zone: z.string().nullable().optional(),
        language: z.string().nullable().optional(),
        locale: z.string().nullable().optional(),
        date_format: z.string().nullable().optional(),
        time_format: z.string().nullable().optional(),
        decimal_separator: z.string().nullable().optional(),
        currency: z.string().nullable().optional(),
        alias: z.string().nullable().optional(),
        signature: z.string().nullable().optional(),
        name_format: z.string().nullable().optional(),
        zuid: z.string().nullable().optional(),
        confirm: z.boolean().optional(),
        microsoft: z.boolean().optional(),
        personal_account: z.boolean().optional(),
        is_online: z.boolean().optional(),
        dob: z.string().nullable().optional(),
        created_time: z.string().optional(),
        modified_time: z.string().optional(),
        created_by: UserRefSchema.optional(),
        modified_by: UserRefSchema.optional(),
        reporting_to: UserRefSchema.nullable().optional(),
        territories: z.array(TerritorySchema).optional(),
        theme: ThemeSchema,
        customize_info: CustomizeInfoSchema,
        offset: z.number().optional()
    })
    .passthrough();

const ProviderResponseSchema = z.object({
    users: z.array(ProviderUserSchema)
});

const OutputSchema = z.object({
    id: z.string(),
    first_name: z.string().optional(),
    last_name: z.string().optional(),
    full_name: z.string().optional(),
    email: z.string().optional(),
    status: z.string().optional(),
    role: RoleSchema.optional(),
    profile: ProfileSchema.optional(),
    phone: z.string().optional(),
    mobile: z.string().optional(),
    fax: z.string().optional(),
    street: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    zip: z.string().optional(),
    country: z.string().optional(),
    country_locale: z.string().optional(),
    website: z.string().optional(),
    time_zone: z.string().optional(),
    language: z.string().optional(),
    locale: z.string().optional(),
    date_format: z.string().optional(),
    time_format: z.string().optional(),
    decimal_separator: z.string().optional(),
    currency: z.string().optional(),
    alias: z.string().optional(),
    signature: z.string().optional(),
    name_format: z.string().optional(),
    zuid: z.string().optional(),
    confirm: z.boolean().optional(),
    microsoft: z.boolean().optional(),
    personal_account: z.boolean().optional(),
    is_online: z.boolean().optional(),
    dob: z.string().optional(),
    created_time: z.string().optional(),
    modified_time: z.string().optional(),
    created_by: UserRefSchema.optional(),
    modified_by: UserRefSchema.optional(),
    reporting_to: UserRefSchema.optional(),
    territories: z.array(TerritorySchema).optional(),
    theme: ThemeSchema,
    customize_info: CustomizeInfoSchema,
    offset: z.number().optional()
});

function normalizeProviderUser(providerUser: z.infer<typeof ProviderUserSchema>): z.infer<typeof OutputSchema> {
    return {
        id: providerUser.id,
        ...(providerUser.first_name != null && { first_name: providerUser.first_name }),
        ...(providerUser.last_name != null && { last_name: providerUser.last_name }),
        ...(providerUser.full_name != null && { full_name: providerUser.full_name }),
        ...(providerUser.email != null && { email: providerUser.email }),
        ...(providerUser.status !== undefined && { status: providerUser.status }),
        ...(providerUser.role !== undefined && { role: providerUser.role }),
        ...(providerUser.profile !== undefined && { profile: providerUser.profile }),
        ...(providerUser.phone != null && { phone: providerUser.phone }),
        ...(providerUser.mobile != null && { mobile: providerUser.mobile }),
        ...(providerUser.fax != null && { fax: providerUser.fax }),
        ...(providerUser.street != null && { street: providerUser.street }),
        ...(providerUser.city != null && { city: providerUser.city }),
        ...(providerUser.state != null && { state: providerUser.state }),
        ...(providerUser.zip != null && { zip: providerUser.zip }),
        ...(providerUser.country != null && { country: providerUser.country }),
        ...(providerUser.country_locale != null && { country_locale: providerUser.country_locale }),
        ...(providerUser.website != null && { website: providerUser.website }),
        ...(providerUser.time_zone != null && { time_zone: providerUser.time_zone }),
        ...(providerUser.language != null && { language: providerUser.language }),
        ...(providerUser.locale != null && { locale: providerUser.locale }),
        ...(providerUser.date_format != null && { date_format: providerUser.date_format }),
        ...(providerUser.time_format != null && { time_format: providerUser.time_format }),
        ...(providerUser.decimal_separator != null && { decimal_separator: providerUser.decimal_separator }),
        ...(providerUser.currency != null && { currency: providerUser.currency }),
        ...(providerUser.alias != null && { alias: providerUser.alias }),
        ...(providerUser.signature != null && { signature: providerUser.signature }),
        ...(providerUser.name_format != null && { name_format: providerUser.name_format }),
        ...(providerUser.zuid != null && { zuid: providerUser.zuid }),
        ...(providerUser.confirm !== undefined && { confirm: providerUser.confirm }),
        ...(providerUser.microsoft !== undefined && { microsoft: providerUser.microsoft }),
        ...(providerUser.personal_account !== undefined && { personal_account: providerUser.personal_account }),
        ...(providerUser.is_online !== undefined && { is_online: providerUser.is_online }),
        ...(providerUser.dob != null && { dob: providerUser.dob }),
        ...(providerUser.created_time !== undefined && { created_time: providerUser.created_time }),
        ...(providerUser.modified_time !== undefined && { modified_time: providerUser.modified_time }),
        ...(providerUser.created_by !== undefined && { created_by: providerUser.created_by }),
        ...(providerUser.modified_by !== undefined && { modified_by: providerUser.modified_by }),
        ...(providerUser.reporting_to != null && { reporting_to: providerUser.reporting_to }),
        ...(providerUser.territories !== undefined && { territories: providerUser.territories }),
        ...(providerUser.theme !== undefined && { theme: providerUser.theme }),
        ...(providerUser.customize_info !== undefined && { customize_info: providerUser.customize_info }),
        ...(providerUser.offset !== undefined && { offset: providerUser.offset })
    };
}

const action = createAction({
    description: 'Retrieve a single user from Zoho CRM.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ZohoCRM.users.READ'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://www.zoho.com/crm/developer/docs/api/v2/users.html
        const response = await nango.get({
            endpoint: `/crm/v2/users/${input.user_id}`,
            retries: 3
        });

        if (response.status === 204 || !response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'User not found',
                user_id: input.user_id
            });
        }

        if (typeof response.data !== 'object') {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Invalid response from Zoho CRM API',
                user_id: input.user_id
            });
        }

        const providerResponse = ProviderResponseSchema.parse(response.data);

        if (!providerResponse.users || providerResponse.users.length === 0) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'User not found',
                user_id: input.user_id
            });
        }

        const providerUser = providerResponse.users[0];
        if (!providerUser) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'User not found',
                user_id: input.user_id
            });
        }
        return normalizeProviderUser(providerUser);
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
