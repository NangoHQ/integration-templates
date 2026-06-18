import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    owner: z.string().describe('The account owner of the repository. Example: "octocat"'),
    repo: z.string().describe('The name of the repository. Example: "Hello-World"'),
    per_page: z.number().int().min(1).max(100).optional().describe('The number of results per page (max 100). Example: 30'),
    page: z.number().int().min(1).optional().describe('Page number of the results to fetch. Example: 1')
});

const ReleaseSchema = z.object({
    id: z.number(),
    node_id: z.string(),
    tag_name: z.string(),
    target_commitish: z.string(),
    name: z.string().nullable().optional(),
    body: z.string().nullable().optional(),
    draft: z.boolean(),
    prerelease: z.boolean(),
    created_at: z.string(),
    published_at: z.string().nullable().optional(),
    author: z
        .object({
            login: z.string(),
            id: z.number(),
            node_id: z.string(),
            avatar_url: z.string(),
            gravatar_id: z.string().nullable().optional(),
            url: z.string(),
            html_url: z.string()
        })
        .optional()
});

const OutputSchema = z.object({
    releases: z.array(ReleaseSchema),
    next_page: z.number().optional()
});

const action = createAction({
    description: 'List published and draft releases for a repository.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['repo'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://docs.github.com/en/rest/releases/releases#list-releases
        const response = await nango.get({
            endpoint: `/repos/${encodeURIComponent(input.owner)}/${encodeURIComponent(input.repo)}/releases`,
            params: {
                ...(input.per_page !== undefined && { per_page: String(input.per_page) }),
                ...(input.page !== undefined && { page: String(input.page) })
            },
            retries: 3
        });

        const releases = z.array(ReleaseSchema).parse(response.data);

        const rawLink = response.headers?.['link'];
        const linkHeader = typeof rawLink === 'string' ? rawLink : undefined;
        const hasNextPage = linkHeader ? linkHeader.includes('rel="next"') : false;
        const currentPage = input.page ?? 1;
        const nextPage = hasNextPage ? currentPage + 1 : undefined;

        return {
            releases,
            ...(nextPage !== undefined && { next_page: nextPage })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
