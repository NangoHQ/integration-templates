import { createAction } from 'nango';
import * as z from 'zod';

const RawCommitSchema = z.object({
    sha: z.string(),
    url: z.string()
});

const RawBranchSchema = z.object({
    name: z.string(),
    commit: RawCommitSchema,
    protected: z.boolean()
});

const InputSchema = z
    .object({
        owner: z.string().describe('The account owner of the repository.'),
        repo: z.string().describe('The name of the repository.'),
        per_page: z.number().min(1).max(100).optional().describe('The number of results per page (max 100).'),
        cursor: z.string().optional().describe('Page number to fetch for pagination.')
    })
    .describe('Input parameters for listing branches in a repository.');

const BranchSchema = z.object({
    name: z.string().describe('The name of the branch.'),
    commit: z
        .object({
            sha: z.string().describe('The SHA of the latest commit on the branch.'),
            url: z.string().describe('The API URL for the commit details.')
        })
        .describe('The latest commit on the branch.'),
    protected: z.boolean().describe('Whether the branch is protected.')
});

const OutputSchema = z
    .object({
        branches: z.array(BranchSchema).describe('The list of branches in the repository.'),
        next_cursor: z.string().optional().describe('The page number for the next page of results, if available.')
    })
    .describe('The list of branches in a repository and optional pagination cursor.');

/**
 * @tags: [read]
 * @tagReason: Lists branches from the GitHub API without mutating repository state.
 */
const action = createAction({
    description: 'List branches in a repository.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['contents:read'],
    exec: async (nango, input) => {
        const page = input.cursor ? parseInt(input.cursor, 10) : 1;
        if (Number.isNaN(page)) {
            throw new nango.ActionError({
                message: 'Invalid cursor: must be a valid page number.'
            });
        }

        const params: Record<string, string | number> = {
            per_page: input.per_page || 30,
            page: page
        };

        // https://docs.github.com/rest/branches/branches#list-branches
        const response = await nango.get({
            endpoint: `/repos/${encodeURIComponent(input.owner)}/${encodeURIComponent(input.repo)}/branches`,
            params,
            retries: 3
        });

        const parseResult = z.array(RawBranchSchema).safeParse(response.data);
        if (!parseResult.success) {
            throw new nango.ActionError({
                message: 'Unexpected response from GitHub API: invalid branch array.'
            });
        }

        const branches = parseResult.data.map((branch) => ({
            name: branch.name,
            commit: {
                sha: branch.commit.sha,
                url: branch.commit.url
            },
            protected: branch.protected
        }));

        const linkHeader = response.headers?.['link'];
        let next_cursor: string | undefined;
        if (typeof linkHeader === 'string') {
            const nextLink = linkHeader.split(',').find((part) => part.includes('rel="next"'));
            if (nextLink) {
                const match = nextLink.match(/[?&]page=(\d+)/);
                if (match && match[1]) {
                    next_cursor = match[1];
                }
            }
        }

        return {
            branches,
            next_cursor
        };
    }
});

export default action;
