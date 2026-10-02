import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    owner: z.string().describe('The account owner of the repository. Example: "viictoo"'),
    repo: z.string().describe('The name of the repository without the .git extension. Example: "api-playground2"'),
    per_page: z.number().int().min(1).max(100).optional().describe('The number of results per page (max 100). Default: 30'),
    page: z.number().int().min(1).optional().describe('The page number of the results to fetch. Default: 1')
});

const CommitSchema = z.object({
    sha: z.string(),
    url: z.string()
});

const TagSchema = z.object({
    name: z.string(),
    commit: CommitSchema,
    zipball_url: z.string(),
    tarball_url: z.string(),
    node_id: z.string()
});

const OutputSchema = z.object({
    tags: z.array(TagSchema),
    next_page: z.number().optional()
});

const action = createAction({
    description: 'List tags for a repository with optional pagination.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['repo'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://docs.github.com/en/rest/repos/repos#list-repository-tags
        const response = await nango.get({
            endpoint: `/repos/${encodeURIComponent(input.owner)}/${encodeURIComponent(input.repo)}/tags`,
            params: {
                ...(input.per_page !== undefined && { per_page: String(input.per_page) }),
                ...(input.page !== undefined && { page: String(input.page) })
            },
            retries: 3
        });

        if (response.status === 404) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Repository not found',
                owner: input.owner,
                repo: input.repo
            });
        }

        const tags = z.array(TagSchema).parse(response.data);

        const perPage = input.per_page ?? 30;
        const currentPage = input.page ?? 1;
        const nextPage = tags.length === perPage ? currentPage + 1 : undefined;

        return {
            tags,
            ...(nextPage !== undefined && { next_page: nextPage })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
