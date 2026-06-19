import { z } from 'zod';
import { createAction } from 'nango';

// https://www.zoho.com/crm/developer/docs/api/v2/users.html
const UserTypeEnum = z.enum([
    'AllUsers',
    'ActiveUsers',
    'DeactiveUsers',
    'ConfirmedUsers',
    'NotConfirmedUsers',
    'DeletedUsers',
    'ActiveConfirmedUsers',
    'AdminUsers',
    'ActiveConfirmedAdmins',
    'CurrentUser'
]);

const InputSchema = z.object({
    type: UserTypeEnum.optional().describe('Type of users to retrieve. Example: "ActiveUsers"'),
    cursor: z.string().optional().describe('Pagination page number from the previous response. Omit for the first page.'),
    per_page: z.number().int().min(1).max(200).optional().describe('Number of records per page. Default and max is 200.'),
    ids: z.string().optional().describe('Comma-separated list of user IDs to filter by. Max 100 IDs.')
});

const ProviderUserSchema = z.object({
    id: z.string(),
    email: z.string().optional().nullable(),
    first_name: z.string().optional().nullable(),
    last_name: z.string().optional().nullable(),
    full_name: z.string().optional().nullable(),
    role: z
        .object({
            name: z.string(),
            id: z.string()
        })
        .optional()
        .nullable(),
    profile: z
        .object({
            name: z.string(),
            id: z.string()
        })
        .optional()
        .nullable(),
    status: z.string().optional().nullable(),
    confirm: z.boolean().optional().nullable(),
    zuid: z.string().optional().nullable(),
    time_zone: z.string().optional().nullable(),
    locale: z.string().optional().nullable(),
    language: z.string().optional().nullable(),
    mobile: z.string().optional().nullable(),
    phone: z.string().optional().nullable(),
    fax: z.string().optional().nullable(),
    street: z.string().optional().nullable(),
    city: z.string().optional().nullable(),
    state: z.string().optional().nullable(),
    country: z.string().optional().nullable(),
    zip: z.string().optional().nullable(),
    country_locale: z.string().optional().nullable(),
    website: z.string().optional().nullable(),
    dob: z.string().optional().nullable(),
    signature: z.string().optional().nullable(),
    created_time: z.string().optional().nullable(),
    Modified_Time: z.string().optional().nullable(),
    Reporting_To: z
        .object({
            name: z.string(),
            id: z.string()
        })
        .optional()
        .nullable(),
    created_by: z
        .object({
            name: z.string(),
            id: z.string()
        })
        .optional()
        .nullable(),
    Modified_By: z
        .object({
            name: z.string(),
            id: z.string()
        })
        .optional()
        .nullable(),
    Currency: z.string().optional().nullable(),
    alias: z.string().optional().nullable(),
    time_format: z.string().optional().nullable(),
    date_format: z.string().optional().nullable(),
    offset: z.number().optional().nullable(),
    Isonline: z.boolean().optional().nullable(),
    microsoft: z.boolean().optional().nullable(),
    personal_account: z.boolean().optional().nullable()
});

const ProviderInfoSchema = z.object({
    per_page: z.number().int(),
    count: z.number().int(),
    page: z.number().int(),
    more_records: z.boolean()
});

const ProviderResponseSchema = z.object({
    users: z.array(ProviderUserSchema),
    info: ProviderInfoSchema
});

const UserOutputSchema = z.object({
    id: z.string(),
    email: z.string().optional(),
    first_name: z.string().optional(),
    last_name: z.string().optional(),
    full_name: z.string().optional(),
    role: z
        .object({
            name: z.string(),
            id: z.string()
        })
        .optional(),
    profile: z
        .object({
            name: z.string(),
            id: z.string()
        })
        .optional(),
    status: z.string().optional(),
    confirm: z.boolean().optional(),
    zuid: z.string().optional(),
    time_zone: z.string().optional(),
    locale: z.string().optional(),
    language: z.string().optional(),
    mobile: z.string().optional(),
    phone: z.string().optional(),
    fax: z.string().optional(),
    street: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    country: z.string().optional(),
    zip: z.string().optional(),
    country_locale: z.string().optional(),
    website: z.string().optional(),
    dob: z.string().optional(),
    signature: z.string().optional(),
    created_time: z.string().optional(),
    modified_time: z.string().optional(),
    reporting_to: z
        .object({
            name: z.string(),
            id: z.string()
        })
        .optional(),
    created_by: z
        .object({
            name: z.string(),
            id: z.string()
        })
        .optional(),
    modified_by: z
        .object({
            name: z.string(),
            id: z.string()
        })
        .optional(),
    currency: z.string().optional(),
    alias: z.string().optional(),
    time_format: z.string().optional(),
    date_format: z.string().optional(),
    offset: z.number().optional(),
    is_online: z.boolean().optional(),
    microsoft: z.boolean().optional(),
    personal_account: z.boolean().optional()
});

const ListOutputSchema = z.object({
    users: z.array(UserOutputSchema),
    next_cursor: z.string().optional(),
    per_page: z.number().int().optional(),
    count: z.number().int().optional(),
    page: z.number().int().optional(),
    more_records: z.boolean().optional()
});

function normalizeUser(user: z.infer<typeof ProviderUserSchema>): z.infer<typeof UserOutputSchema> {
    return {
        id: user.id,
        ...(user.email != null && { email: user.email }),
        ...(user.first_name != null && { first_name: user.first_name }),
        ...(user.last_name != null && { last_name: user.last_name }),
        ...(user.full_name != null && { full_name: user.full_name }),
        ...(user.role != null && { role: user.role }),
        ...(user.profile != null && { profile: user.profile }),
        ...(user.status != null && { status: user.status }),
        ...(user.confirm != null && { confirm: user.confirm }),
        ...(user.zuid != null && { zuid: user.zuid }),
        ...(user.time_zone != null && { time_zone: user.time_zone }),
        ...(user.locale != null && { locale: user.locale }),
        ...(user.language != null && { language: user.language }),
        ...(user.mobile != null && { mobile: user.mobile }),
        ...(user.phone != null && { phone: user.phone }),
        ...(user.fax != null && { fax: user.fax }),
        ...(user.street != null && { street: user.street }),
        ...(user.city != null && { city: user.city }),
        ...(user.state != null && { state: user.state }),
        ...(user.country != null && { country: user.country }),
        ...(user.zip != null && { zip: user.zip }),
        ...(user.country_locale != null && { country_locale: user.country_locale }),
        ...(user.website != null && { website: user.website }),
        ...(user.dob != null && { dob: user.dob }),
        ...(user.signature != null && { signature: user.signature }),
        ...(user.created_time != null && { created_time: user.created_time }),
        ...(user.Modified_Time != null && { modified_time: user.Modified_Time }),
        ...(user.Reporting_To != null && { reporting_to: user.Reporting_To }),
        ...(user.created_by != null && { created_by: user.created_by }),
        ...(user.Modified_By != null && { modified_by: user.Modified_By }),
        ...(user.Currency != null && { currency: user.Currency }),
        ...(user.alias != null && { alias: user.alias }),
        ...(user.time_format != null && { time_format: user.time_format }),
        ...(user.date_format != null && { date_format: user.date_format }),
        ...(user.offset != null && { offset: user.offset }),
        ...(user.Isonline != null && { is_online: user.Isonline }),
        ...(user.microsoft != null && { microsoft: user.microsoft }),
        ...(user.personal_account != null && { personal_account: user.personal_account })
    };
}

const action = createAction({
    description: 'List users from Zoho CRM.',
    version: '1.0.1',
    input: InputSchema,
    output: ListOutputSchema,
    scopes: ['ZohoCRM.users.READ'],

    exec: async (nango, input): Promise<z.infer<typeof ListOutputSchema>> => {
        const params: Record<string, string | number> = {};

        if (input.type !== undefined) {
            params['type'] = input.type;
        }

        if (input.cursor !== undefined) {
            params['page'] = parseInt(input.cursor, 10);
        }

        if (input.per_page !== undefined) {
            params['per_page'] = input.per_page;
        }

        if (input.ids !== undefined) {
            params['ids'] = input.ids;
        }

        // https://www.zoho.com/crm/developer/docs/api/v2/users.html
        const response = await nango.get({
            endpoint: '/crm/v2/users',
            params,
            retries: 3
        });

        const parsedResponse = ProviderResponseSchema.parse(response.data);

        const normalizedUsers = parsedResponse.users.map(normalizeUser);

        return {
            users: normalizedUsers,
            ...(parsedResponse.info.more_records && {
                next_cursor: String(parsedResponse.info.page + 1)
            }),
            per_page: parsedResponse.info.per_page,
            count: parsedResponse.info.count,
            page: parsedResponse.info.page,
            more_records: parsedResponse.info.more_records
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
