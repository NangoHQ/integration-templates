import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor (page number). Omit for the first page.'),
    per_page: z.number().int().min(1).max(100).optional().describe('Number of results per page (max 100).'),
    search: z.string().optional().describe('Filter projects by name.'),
    owned: z.boolean().optional().describe('Limit to projects owned by the current user.'),
    membership: z.boolean().optional().describe('Limit to projects where the current user is a member.'),
    visibility: z.enum(['private', 'internal', 'public']).optional().describe('Filter by visibility level.'),
    archived: z.boolean().optional().describe('Include archived projects.')
});

const ProviderProjectSchema = z.object({
    id: z.number(),
    name: z.string(),
    path: z.string(),
    description: z.string().nullable().optional(),
    web_url: z.string(),
    created_at: z.string().nullable().optional(),
    updated_at: z.string().nullable().optional(),
    visibility: z.string().nullable().optional(),
    default_branch: z.string().nullable().optional()
});

const ProjectSchema = z.object({
    id: z.number(),
    name: z.string(),
    path: z.string(),
    description: z.string().optional(),
    web_url: z.string(),
    created_at: z.string().optional(),
    updated_at: z.string().optional(),
    visibility: z.string().optional(),
    default_branch: z.string().optional()
});

const OutputSchema = z.object({
    items: z.array(ProjectSchema),
    next_cursor: z.string().optional()
});

const action = createAction({
    description: 'List projects from GitLab.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/list-projects',
        group: 'Projects'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['read_api', 'read_repository'],

    exec: async (nango, input) => {
        const currentPage = input.cursor ? Number(input.cursor) : 1;
        if (Number.isNaN(currentPage) || currentPage < 1) {
            throw new nango.ActionError({
                type: 'invalid_input',
                message: 'cursor must be a valid positive page number'
            });
        }

        const perPage = input.per_page ?? 20;

        const response = await nango.get({
            // https://docs.gitlab.com/api/projects/#list-all-projects
            endpoint: '/api/v4/projects',
            params: {
                page: currentPage,
                per_page: perPage,
                ...(input.search !== undefined && { search: input.search }),
                ...(input.owned !== undefined && { owned: String(input.owned) }),
                ...(input.membership !== undefined && { membership: String(input.membership) }),
                ...(input.visibility !== undefined && { visibility: input.visibility }),
                ...(input.archived !== undefined && { archived: String(input.archived) })
            },
            retries: 3
        });

        const projects = z.array(ProviderProjectSchema).parse(response.data);

        const nextPageHeader = response.headers['x-next-page'];
        const next_cursor = typeof nextPageHeader === 'string' && nextPageHeader.length > 0 ? nextPageHeader : undefined;

        return {
            items: projects.map((project) => ({
                id: project.id,
                name: project.name,
                path: project.path,
                ...(project.description != null && { description: project.description }),
                web_url: project.web_url,
                ...(project.created_at != null && { created_at: project.created_at }),
                ...(project.updated_at != null && { updated_at: project.updated_at }),
                ...(project.visibility != null && { visibility: project.visibility }),
                ...(project.default_branch != null && { default_branch: project.default_branch })
            })),
            ...(next_cursor !== undefined && { next_cursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
