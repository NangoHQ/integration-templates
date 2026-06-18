import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    owner: z.string().describe('The account owner of the repository. Example: "viictoo"'),
    repo: z.string().describe('The name of the repository without the .git extension. Example: "api-playground2"'),
    protected: z
        .boolean()
        .optional()
        .describe(
            'Setting to true returns only protected branches. Setting to false returns only unprotected branches. Omitting this parameter returns all branches.'
        ),
    per_page: z.number().int().min(1).max(100).optional().describe('The number of results per page (max 100). Default: 30'),
    page: z.number().int().min(1).optional().describe('The page number of the results to fetch. Default: 1')
});

const CommitSchema = z.object({
    sha: z.string(),
    url: z.string()
});

const BranchSchema = z.object({
    name: z.string(),
    commit: CommitSchema,
    protected: z.boolean()
});

const OutputSchema = z.object({
    branches: z.array(BranchSchema),
    next_page: z.number().optional()
});

const action = createAction({
    description: 'List branches for a repository with optional pagination and protected filtering.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['repo'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://docs.github.com/en/rest/branches/branches#list-branches
        const response = await nango.get({
            endpoint: `/repos/${encodeURIComponent(input.owner)}/${encodeURIComponent(input.repo)}/branches`,
            params: {
                ...(input.protected !== undefined && { protected: String(input.protected) }),
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

        const branches = z.array(BranchSchema).parse(response.data);

        const effectivePerPage = input.per_page ?? 30;
        const effectivePage = input.page ?? 1;
        const nextPage = branches.length === effectivePerPage ? effectivePage + 1 : undefined;

        return {
            branches,
            ...(nextPage !== undefined && { next_page: nextPage })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
