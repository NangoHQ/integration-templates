import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor (page number). Omit for the first page.'),
    search: z.string().optional().describe('Search query to filter groups.'),
    owned: z.boolean().optional().describe('Limit to groups explicitly owned by the current user.'),
    min_access_level: z.number().optional().describe('Minimum access level of the authenticated user.'),
    top_level_only: z.boolean().optional().describe('Limit to top level groups only.'),
    per_page: z.number().optional().describe('Number of results to return per page.')
});

const ProviderGroupSchema = z.object({
    id: z.number(),
    name: z.string(),
    path: z.string(),
    description: z.string().nullable().optional(),
    visibility: z.string().optional(),
    web_url: z.string().optional(),
    full_name: z.string().optional(),
    full_path: z.string().optional(),
    parent_id: z.number().nullable().optional(),
    created_at: z.string().optional()
});

const GroupSchema = z.object({
    id: z.number(),
    name: z.string(),
    path: z.string(),
    description: z.string().optional(),
    visibility: z.string().optional(),
    web_url: z.string().optional(),
    full_name: z.string().optional(),
    full_path: z.string().optional(),
    parent_id: z.number().optional(),
    created_at: z.string().optional()
});

const OutputSchema = z.object({
    items: z.array(GroupSchema),
    next_cursor: z.string().optional()
});

const action = createAction({
    description: 'List groups from GitLab.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/list-groups'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['read_api', 'read_user'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://docs.gitlab.com/api/groups/#list-groups
        const response = await nango.get({
            endpoint: '/api/v4/groups',
            params: {
                ...(input.cursor !== undefined && { page: input.cursor }),
                ...(input.search !== undefined && { search: input.search }),
                ...(input.owned !== undefined && { owned: String(input.owned) }),
                ...(input.min_access_level !== undefined && { min_access_level: String(input.min_access_level) }),
                ...(input.top_level_only !== undefined && { top_level_only: String(input.top_level_only) }),
                ...(input.per_page !== undefined && { per_page: String(input.per_page) })
            },
            retries: 3
        });

        const providerGroups = z.array(ProviderGroupSchema).parse(response.data);

        const items = providerGroups.map((group) => ({
            id: group.id,
            name: group.name,
            path: group.path,
            ...(group.description != null && { description: group.description }),
            ...(group.visibility !== undefined && { visibility: group.visibility }),
            ...(group.web_url !== undefined && { web_url: group.web_url }),
            ...(group.full_name !== undefined && { full_name: group.full_name }),
            ...(group.full_path !== undefined && { full_path: group.full_path }),
            ...(group.parent_id != null && { parent_id: group.parent_id }),
            ...(group.created_at !== undefined && { created_at: group.created_at })
        }));

        const nextPageHeader = response.headers['x-next-page'];
        const next_cursor = typeof nextPageHeader === 'string' && nextPageHeader.length > 0 ? nextPageHeader : undefined;

        return {
            items,
            ...(next_cursor !== undefined && { next_cursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
