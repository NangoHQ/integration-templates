import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        owner: z.string().describe('The account owner of the repository. The name is not case-sensitive.'),
        repo: z.string().describe('The name of the repository without the .git extension. The name is not case-sensitive.'),
        branch: z.string().describe('The name of the branch. Cannot contain wildcard characters.')
    })
    .describe('Input for getting a single branch from a GitHub repository.');

const ProviderBranchSchema = z.object({
    name: z.string(),
    commit: z.object({
        sha: z.string()
    }),
    protected: z.boolean().optional(),
    protection_url: z.string().optional(),
    html_url: z.string().optional()
});

const OutputSchema = z
    .object({
        name: z.string().describe('The name of the branch.'),
        commit_sha: z.string().describe('The SHA of the latest commit on this branch.'),
        protected: z.boolean().optional().describe('Whether the branch is protected.'),
        protection_url: z.string().optional().describe('The API URL for branch protection details.'),
        html_url: z.string().optional().describe('The URL to view the branch on GitHub.')
    })
    .describe('Output containing details of a single branch, including its latest commit SHA.');

/**
 * @tags: [read]
 * @tagReason: Reads branch metadata and the latest commit SHA from the GitHub API.
 * @pitfalls: Branch names are case-sensitive, unlike repository owners and names which are not.
 */
const action = createAction({
    description: 'Get details of a single branch, including its latest commit sha.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['contents:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://docs.github.com/en/rest/branches/branches?apiVersion=2022-11-28#get-a-branch
            endpoint: `repos/${encodeURIComponent(input.owner)}/${encodeURIComponent(input.repo)}/branches/${encodeURIComponent(input.branch)}`,
            retries: 3
        });

        const branch = ProviderBranchSchema.parse(response.data);

        return {
            name: branch.name,
            commit_sha: branch.commit.sha,
            ...(branch.protected !== undefined && { protected: branch.protected }),
            ...(branch.protection_url !== undefined && { protection_url: branch.protection_url }),
            ...(branch.html_url !== undefined && { html_url: branch.html_url })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
