import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    start: z.number().optional().describe('Pagination start offset. Example: 0'),
    limit: z.number().optional().describe('Number of items per page. Maximum 500. Example: 50')
});

const ProviderUserSchema = z.object({
    id: z.number().describe('User ID'),
    name: z.string().nullable().optional(),
    email: z.string().nullable().optional(),
    phone: z.string().nullable().optional(),
    locale: z.string().nullable().optional(),
    timezone_name: z.string().nullable().optional(),
    timezone_offset: z.string().nullable().optional(),
    created: z.string().nullable().optional(),
    modified: z.string().nullable().optional(),
    last_login: z.string().nullable().optional(),
    activated: z.boolean().optional(),
    is_admin: z.number().nullable().optional(),
    role_id: z.number().nullable().optional(),
    icon_url: z.string().nullable().optional(),
    active_flag: z.boolean().optional()
});

const UserOutputSchema = z.object({
    id: z.number().describe('User ID'),
    name: z.string().optional(),
    email: z.string().optional(),
    phone: z.string().optional(),
    locale: z.string().optional(),
    timezone_name: z.string().optional(),
    timezone_offset: z.string().optional(),
    created: z.string().optional(),
    modified: z.string().optional(),
    last_login: z.string().optional(),
    activated: z.boolean().optional(),
    is_admin: z.number().optional(),
    role_id: z.number().optional(),
    icon_url: z.string().optional(),
    active_flag: z.boolean().optional()
});

const ListOutputSchema = z.object({
    items: z.array(UserOutputSchema),
    success: z.boolean(),
    additional_data: z
        .object({
            pagination: z
                .object({
                    start: z.number(),
                    limit: z.number(),
                    more_items_in_collection: z.boolean().optional()
                })
                .optional()
        })
        .passthrough()
        .optional()
});

const action = createAction({
    description: 'List users from Pipedrive',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/list-users',
        group: 'Users'
    },
    input: InputSchema,
    output: ListOutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof ListOutputSchema>> => {
        const params: Record<string, string | number> = {};
        if (input.start !== undefined) {
            params['start'] = input.start;
        }
        if (input.limit !== undefined) {
            params['limit'] = input.limit;
        }

        const response = await nango.get({
            // https://developers.pipedrive.com/docs/api/v1/Users#getUsers
            endpoint: '/v1/users',
            params,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'no_data',
                message: 'No data received from Pipedrive API'
            });
        }

        const rawData = response.data;
        const users = Array.isArray(rawData.data) ? rawData.data : [];

        const parsedUsers = users
            .map((user: unknown) => {
                const parsed = ProviderUserSchema.safeParse(user);
                if (!parsed.success) {
                    return null;
                }
                const u = parsed.data;
                return {
                    id: u.id,
                    ...(u.name != null && { name: u.name }),
                    ...(u.email != null && { email: u.email }),
                    ...(u.phone != null && { phone: u.phone }),
                    ...(u.locale != null && { locale: u.locale }),
                    ...(u.timezone_name != null && { timezone_name: u.timezone_name }),
                    ...(u.timezone_offset != null && { timezone_offset: u.timezone_offset }),
                    ...(u.created != null && { created: u.created }),
                    ...(u.modified != null && { modified: u.modified }),
                    ...(u.last_login != null && { last_login: u.last_login }),
                    ...(u.activated !== undefined && { activated: u.activated }),
                    ...(u.is_admin != null && { is_admin: u.is_admin }),
                    ...(u.role_id != null && { role_id: u.role_id }),
                    ...(u.icon_url != null && { icon_url: u.icon_url }),
                    ...(u.active_flag !== undefined && { active_flag: u.active_flag })
                };
            })
            .filter((item: z.infer<typeof UserOutputSchema> | null): item is z.infer<typeof UserOutputSchema> => item !== null);

        return {
            items: parsedUsers,
            success: rawData.success === true,
            additional_data: rawData.additional_data
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
