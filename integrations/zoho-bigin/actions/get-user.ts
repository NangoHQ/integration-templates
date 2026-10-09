import { z } from 'zod';
import { createAction, type ProxyConfiguration } from 'nango';

const InputSchema = z
    .object({
        user_id: z.string().describe('Unique ID of the Bigin user to retrieve. Example: "7618134000000627001".')
    })
    .describe('Identifies the Bigin user to retrieve.');

const UserRefSchema = z.object({
    id: z.string().optional().describe('Unique ID of the related record.'),
    name: z.string().optional().describe('Display name of the related record.')
});

const OutputSchema = z
    .object({
        id: z.string().describe('Unique ID of the Bigin user. Example: "7618134000000627001".'),
        full_name: z.string().optional().describe('Full display name of the user. Example: "Nango Developer".'),
        first_name: z.string().optional().describe('First name of the user.'),
        last_name: z.string().optional().describe('Last name of the user.'),
        email: z.string().optional().describe('Email address of the user.'),
        phone: z.string().optional().describe('Phone number of the user.'),
        mobile: z.string().optional().describe('Mobile number of the user.'),
        fax: z.string().optional().describe('Fax number of the user.'),
        website: z.string().optional().describe('Website URL associated with the user.'),
        zuid: z.string().optional().describe('Zoho account ID of the user.'),
        status: z.string().optional().describe('Status of the user reported by Bigin. Example: "active".'),
        category: z.string().optional().describe('Category the user belongs to. Example: "regular_user".'),
        confirm: z.boolean().optional().describe('Whether the user account is confirmed.'),
        is_online: z.boolean().optional().describe('Whether the user is currently online.'),
        role: UserRefSchema.optional().describe('Role assigned to the user.'),
        profile: UserRefSchema.optional().describe('Profile assigned to the user.'),
        created_by: UserRefSchema.optional().describe('User who created this user record.'),
        modified_by: UserRefSchema.optional().describe('User who last modified this user record.'),
        created_time: z.string().optional().describe('ISO 8601 timestamp when the user was created.'),
        modified_time: z.string().optional().describe('ISO 8601 timestamp of the last modification to the user.'),
        time_zone: z.string().optional().describe('Time zone configured for the user. Example: "Africa/Nairobi".'),
        language: z.string().optional().describe('Preferred language of the user. Example: "en_US".'),
        locale: z.string().optional().describe('Locale setting of the user. Example: "en_US".'),
        country: z.string().optional().describe('Country of the user.'),
        state: z.string().optional().describe('State or province of the user.'),
        city: z.string().optional().describe('City of the user.'),
        street: z.string().optional().describe('Street address of the user.'),
        zip: z.string().optional().describe('ZIP or postal code of the user.'),
        dob: z.string().optional().describe('Date of birth of the user.'),
        offset: z.number().optional().describe('Time zone offset of the user in milliseconds.')
    })
    .describe('Details of a single Bigin user.');

const ProviderUserRefSchema = z.object({
    id: z.string().nullable().optional(),
    name: z.string().nullable().optional()
});

const ProviderUserSchema = z.object({
    id: z.string(),
    full_name: z.string().nullable().optional(),
    first_name: z.string().nullable().optional(),
    last_name: z.string().nullable().optional(),
    email: z.string().nullable().optional(),
    phone: z.string().nullable().optional(),
    mobile: z.string().nullable().optional(),
    fax: z.string().nullable().optional(),
    website: z.string().nullable().optional(),
    zuid: z.string().nullable().optional(),
    status: z.string().nullable().optional(),
    category: z.string().nullable().optional(),
    confirm: z.boolean().nullable().optional(),
    Isonline: z.boolean().nullable().optional(),
    role: ProviderUserRefSchema.nullable().optional(),
    profile: ProviderUserRefSchema.nullable().optional(),
    created_by: ProviderUserRefSchema.nullable().optional(),
    Modified_By: ProviderUserRefSchema.nullable().optional(),
    created_time: z.string().nullable().optional(),
    Modified_Time: z.string().nullable().optional(),
    time_zone: z.string().nullable().optional(),
    language: z.string().nullable().optional(),
    locale: z.string().nullable().optional(),
    country: z.string().nullable().optional(),
    state: z.string().nullable().optional(),
    city: z.string().nullable().optional(),
    street: z.string().nullable().optional(),
    zip: z.string().nullable().optional(),
    dob: z.string().nullable().optional(),
    offset: z.number().nullable().optional()
});

const ProviderResponseSchema = z.object({
    users: z.array(ProviderUserSchema)
});

function normalizeRef(ref: z.infer<typeof ProviderUserRefSchema> | null | undefined): z.infer<typeof UserRefSchema> | undefined {
    if (ref == null) {
        return undefined;
    }
    return {
        ...(ref.id != null && { id: ref.id }),
        ...(ref.name != null && { name: ref.name })
    };
}

function normalizeUser(user: z.infer<typeof ProviderUserSchema>): z.infer<typeof OutputSchema> {
    const role = normalizeRef(user.role);
    const profile = normalizeRef(user.profile);
    const createdBy = normalizeRef(user.created_by);
    const modifiedBy = normalizeRef(user.Modified_By);

    return {
        id: user.id,
        ...(user.full_name != null && { full_name: user.full_name }),
        ...(user.first_name != null && { first_name: user.first_name }),
        ...(user.last_name != null && { last_name: user.last_name }),
        ...(user.email != null && { email: user.email }),
        ...(user.phone != null && { phone: user.phone }),
        ...(user.mobile != null && { mobile: user.mobile }),
        ...(user.fax != null && { fax: user.fax }),
        ...(user.website != null && { website: user.website }),
        ...(user.zuid != null && { zuid: user.zuid }),
        ...(user.status != null && { status: user.status }),
        ...(user.category != null && { category: user.category }),
        ...(user.confirm != null && { confirm: user.confirm }),
        ...(user.Isonline != null && { is_online: user.Isonline }),
        ...(role != null && { role }),
        ...(profile != null && { profile }),
        ...(createdBy != null && { created_by: createdBy }),
        ...(modifiedBy != null && { modified_by: modifiedBy }),
        ...(user.created_time != null && { created_time: user.created_time }),
        ...(user.Modified_Time != null && { modified_time: user.Modified_Time }),
        ...(user.time_zone != null && { time_zone: user.time_zone }),
        ...(user.language != null && { language: user.language }),
        ...(user.locale != null && { locale: user.locale }),
        ...(user.country != null && { country: user.country }),
        ...(user.state != null && { state: user.state }),
        ...(user.city != null && { city: user.city }),
        ...(user.street != null && { street: user.street }),
        ...(user.zip != null && { zip: user.zip }),
        ...(user.dob != null && { dob: user.dob }),
        ...(user.offset != null && { offset: user.offset })
    };
}

/**
 * @tags: [read]
 * @tagReason: Retrieves a single Bigin user by ID and never modifies provider state.
 * @pitfalls: A nonexistent user throws a "not_found" ActionError rather than returning an empty result; a numeric ID exceeding a signed 64-bit integer silently returns the current user instead of reporting not found.
 */
const action = createAction({
    description: 'Retrieve a single user by ID.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://www.bigin.com/developer/docs/apis/v2/users.html
            endpoint: `/bigin/v2/users/${encodeURIComponent(input.user_id)}`,
            retries: 3
        };
        const response = await nango.get<unknown>(config);

        if (response.status === 204 || response.data == null) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'User not found',
                user_id: input.user_id
            });
        }

        const parsed = ProviderResponseSchema.parse(response.data);
        const user = parsed.users[0];

        if (user == null) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'User not found',
                user_id: input.user_id
            });
        }

        return normalizeUser(user);
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
