import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        owner: z.string().describe('Repository owner. Example: "nango-provisioned-apps"'),
        repo: z.string().describe('Repository name. Example: "nango"'),
        cursor: z.string().optional().describe('Page number for pagination. Omit for the first page. Example: "2"'),
        per_page: z.number().min(1).max(100).optional().describe('Number of results per page (max 100). Defaults to 30.')
    })
    .describe('Input for listing branches in a repository.');

const BranchCommitSchema = z
    .object({
        sha: z.string().describe('Commit SHA.'),
        url: z.string().describe('API URL for the commit.')
    })
    .describe('Commit metadata at the tip of the branch.');

const BranchSchema = z.object({
    name: z.string().describe('Branch name.'),
    commit: BranchCommitSchema,
    protected: z.boolean().optional().describe('Whether the branch is protected.')
});

const OutputSchema = z
    .object({
        items: z.array(BranchSchema).describe('List of branches in the repository.'),
        next_cursor: z.string().optional().describe('Page number to request the next page of results.')
    })
    .describe('Output for listing branches in a repository.');

/**
 * @tags: [read]
 * @tagReason: Reads branch metadata from the repository.
 */
const action = createAction({
    description: 'List branches in a repository.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const perPage = input.per_page ?? 30;
        const page = input.cursor ? parseInt(input.cursor, 10) : 1;

        // https://docs.github.com/rest/branches/branches#list-branches
        const response = await nango.get({
            endpoint: `/repos/${encodeURIComponent(input.owner)}/${encodeURIComponent(input.repo)}/branches`,
            params: {
                per_page: perPage,
                page: page
            },
            retries: 3
        });

        const providerBranches = z
            .array(
                z.object({
                    name: z.string(),
                    commit: z.object({
                        sha: z.string(),
                        url: z.string()
                    }),
                    protected: z.boolean().optional()
                })
            )
            .parse(response.data);

        const items = providerBranches.map((branch) => ({
            name: branch.name,
            commit: {
                sha: branch.commit.sha,
                url: branch.commit.url
            },
            ...(branch.protected !== undefined && { protected: branch.protected })
        }));

        const next_cursor = items.length === perPage ? String(page + 1) : undefined;

        return {
            items,
            ...(next_cursor !== undefined && { next_cursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
