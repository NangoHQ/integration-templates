import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.number().int().describe('The ID of the user. Example: 123')
});

const ProviderUserSchema = z
    .object({
        id: z.number().int(),
        name: z.string(),
        email: z.string(),
        active_flag: z.boolean(),
        timezone_name: z.string().optional(),
        timezone_offset: z.string().optional(),
        lang: z.union([z.string(), z.number()]).optional(),
        locale: z.string().optional(),
        phone: z.string().optional().nullable(),
        created: z.string().optional(),
        modified: z.string().optional(),
        last_login: z.string().optional().nullable(),
        is_admin: z.union([z.boolean(), z.number()]).optional(),
        role_id: z.number().int().optional().nullable(),
        icon_url: z.string().optional().nullable(),
        company_id: z.number().int().optional()
    })
    .passthrough();

const OutputSchema = z.object({
    id: z.number().int(),
    name: z.string(),
    email: z.string(),
    active_flag: z.boolean(),
    timezone_name: z.string().optional(),
    timezone_offset: z.string().optional(),
    lang: z.union([z.string(), z.number()]).optional(),
    locale: z.string().optional(),
    phone: z.string().optional(),
    created: z.string().optional(),
    modified: z.string().optional(),
    last_login: z.string().optional(),
    is_admin: z.union([z.boolean(), z.number()]).optional(),
    role_id: z.number().int().optional(),
    icon_url: z.string().optional()
});

const ResponseSchema = z.object({
    success: z.boolean(),
    data: ProviderUserSchema
});

const action = createAction({
    description: 'Retrieve a single user from Pipedrive.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/get-user',
        group: 'Users'
    },
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://developers.pipedrive.com/docs/api/v1/Users#getUser
            endpoint: `/v1/users/${input.id}`,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'User not found',
                id: input.id
            });
        }

        const parsedResponse = ResponseSchema.parse(response.data);
        const providerUser = parsedResponse.data;

        return {
            id: providerUser.id,
            name: providerUser.name,
            email: providerUser.email,
            active_flag: providerUser.active_flag,
            ...(providerUser.timezone_name !== undefined && { timezone_name: providerUser.timezone_name }),
            ...(providerUser.timezone_offset !== undefined && { timezone_offset: providerUser.timezone_offset }),
            ...(providerUser.lang !== undefined && { lang: providerUser.lang }),
            ...(providerUser.locale !== undefined && { locale: providerUser.locale }),
            ...(providerUser.phone != null && { phone: providerUser.phone }),
            ...(providerUser.created !== undefined && { created: providerUser.created }),
            ...(providerUser.modified !== undefined && { modified: providerUser.modified }),
            ...(providerUser.last_login != null && { last_login: providerUser.last_login }),
            ...(providerUser.is_admin !== undefined && { is_admin: providerUser.is_admin }),
            ...(providerUser.role_id != null && { role_id: providerUser.role_id }),
            ...(providerUser.icon_url != null && { icon_url: providerUser.icon_url })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
