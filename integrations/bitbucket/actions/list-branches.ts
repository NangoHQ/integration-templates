import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    workspace: z.string().describe('Workspace slug. Example: "nangodev"'),
    repo_slug: z.string().describe('Repository slug. Example: "nango-api-test"'),
    q: z.string().optional().describe('Query string for filtering. Example: \'name ~ "feature"\''),
    sort: z.string().optional().describe('Sort string. Example: "-name"'),
    pagelen: z.number().optional().describe('Number of results per page. Example: 10'),
    page: z.number().optional().describe('Page number for pagination. Example: 1')
});

const LinkSchema = z.object({
    href: z.string(),
    name: z.string().optional()
});

const LinksSchema = z.object({
    self: LinkSchema.optional(),
    commits: LinkSchema.optional(),
    html: LinkSchema.optional()
});

const CommitTargetSchema = z.object({
    hash: z.string(),
    type: z.string().optional(),
    date: z.string().optional(),
    message: z.string().optional(),
    links: z.object({}).passthrough().optional(),
    author: z.object({}).passthrough().optional(),
    parents: z.array(z.object({}).passthrough()).optional()
});

const BranchSchema = z.object({
    type: z.string().optional(),
    name: z.string(),
    links: LinksSchema.optional(),
    default_merge_strategy: z.string().optional(),
    merge_strategies: z.array(z.string()).optional(),
    target: CommitTargetSchema.optional()
});

const ProviderResponseSchema = z.object({
    pagelen: z.number().optional(),
    size: z.number().optional(),
    page: z.number().optional(),
    next: z.string().optional(),
    previous: z.string().optional(),
    values: z.array(BranchSchema)
});

const OutputSchema = z.object({
    branches: z.array(
        z.object({
            name: z.string(),
            type: z.string().optional(),
            default_merge_strategy: z.string().optional(),
            merge_strategies: z.array(z.string()).optional(),
            target_hash: z.string().optional(),
            target_date: z.string().optional(),
            target_message: z.string().optional()
        })
    ),
    next_page: z.number().optional()
});

const action = createAction({
    description: 'List branches for a repository',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['repository'],

    exec: async (nango, input) => {
        // https://developer.atlassian.com/cloud/bitbucket/rest/api-group-refs/#api-repositories-workspace-repo-slug-refs-branches-get
        const response = await nango.get({
            endpoint: `/2.0/repositories/${encodeURIComponent(input.workspace)}/${encodeURIComponent(input.repo_slug)}/refs/branches`,
            params: {
                ...(input.q !== undefined && { q: input.q }),
                ...(input.sort !== undefined && { sort: input.sort }),
                ...(input.pagelen !== undefined && { pagelen: String(input.pagelen) }),
                ...(input.page !== undefined && { page: String(input.page) })
            },
            retries: 3
        });

        const parsed = ProviderResponseSchema.parse(response.data);

        const branches = parsed.values.map((branch) => ({
            name: branch.name,
            ...(branch.type !== undefined && { type: branch.type }),
            ...(branch.default_merge_strategy !== undefined && { default_merge_strategy: branch.default_merge_strategy }),
            ...(branch.merge_strategies !== undefined && { merge_strategies: branch.merge_strategies }),
            ...(branch.target?.hash !== undefined && { target_hash: branch.target.hash }),
            ...(branch.target?.date !== undefined && { target_date: branch.target.date }),
            ...(branch.target?.message !== undefined && { target_message: branch.target.message })
        }));

        let next_page: number | undefined;
        if (parsed.next !== undefined) {
            const nextUrl = new URL(parsed.next);
            const nextPage = nextUrl.searchParams.get('page');
            if (nextPage !== null) {
                const parsedPage = Number(nextPage);
                if (!Number.isNaN(parsedPage)) {
                    next_page = parsedPage;
                }
            }
        }

        return {
            branches,
            ...(next_page !== undefined && { next_page })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
