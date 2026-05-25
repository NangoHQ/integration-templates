import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    page: z.number().optional().describe('Page number for pagination. Defaults to 1.')
});

const ProviderUserSchema = z.object({
    id: z.string(),
    email: z.string().optional(),
    first_name: z.string().optional(),
    last_name: z.string().optional(),
    name: z.string().optional(),
    phone: z.string().optional(),
    team_id: z.string().optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional(),
    user_type: z.string().optional(),
    api_key: z.string().optional()
});

const ProviderPaginationSchema = z.object({
    page: z.union([z.number(), z.string()]).optional(),
    per_page: z.union([z.number(), z.string()]).optional(),
    total_entries: z.union([z.number(), z.string()]).optional(),
    total_pages: z.union([z.number(), z.string()]).optional()
});

const ProviderResponseSchema = z.object({
    users: z.array(ProviderUserSchema),
    pagination: ProviderPaginationSchema.optional()
});

const UserOutputSchema = z.object({
    id: z.string(),
    email: z.string().optional(),
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    name: z.string().optional(),
    phone: z.string().optional(),
    teamId: z.string().optional(),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional(),
    userType: z.string().optional()
});

const OutputSchema = z.object({
    users: z.array(UserOutputSchema),
    nextPage: z.number().optional(),
    totalPages: z.number().optional(),
    totalEntries: z.number().optional()
});

const action = createAction({
    description: 'List users (team members) in the Apollo organisation.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/list-users',
        group: 'Users'
    },
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://docs.apollo.io/reference/users
        const response = await nango.get({
            endpoint: '/v1/users/search',
            params: {
                page: String(input.page ?? 1)
            },
            retries: 3
        });

        const parsed = ProviderResponseSchema.parse(response.data);

        const result: z.infer<typeof OutputSchema> = {
            users: parsed.users.map((user) => ({
                id: user.id,
                ...(user.email !== undefined && { email: user.email }),
                ...(user.first_name !== undefined && { firstName: user.first_name }),
                ...(user.last_name !== undefined && { lastName: user.last_name }),
                ...(user.name !== undefined && { name: user.name }),
                ...(user.phone !== undefined && { phone: user.phone }),
                ...(user.team_id !== undefined && { teamId: user.team_id }),
                ...(user.created_at !== undefined && { createdAt: user.created_at }),
                ...(user.updated_at !== undefined && { updatedAt: user.updated_at }),
                ...(user.user_type !== undefined && { userType: user.user_type })
            }))
        };

        if (parsed.pagination !== undefined) {
            if (parsed.pagination.total_pages !== undefined) {
                const totalPages =
                    typeof parsed.pagination.total_pages === 'string' ? parseInt(parsed.pagination.total_pages, 10) : parsed.pagination.total_pages;
                result.totalPages = totalPages;

                if (parsed.pagination.page !== undefined) {
                    const currentPage = typeof parsed.pagination.page === 'string' ? parseInt(parsed.pagination.page, 10) : parsed.pagination.page;
                    if (currentPage < totalPages) {
                        result.nextPage = currentPage + 1;
                    }
                }
            }

            if (parsed.pagination.total_entries !== undefined) {
                result.totalEntries =
                    typeof parsed.pagination.total_entries === 'string' ? parseInt(parsed.pagination.total_entries, 10) : parsed.pagination.total_entries;
            }
        }

        return result;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
