import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        owner: z.string().describe('The account owner of the repository. The name is not case-sensitive.'),
        repo: z.string().describe('The name of the repository. The name is not case-sensitive.'),
        branch: z.string().describe('The name of the branch. Cannot contain wildcard characters.')
    })
    .describe('Input parameters for retrieving a single branch.');

const ProviderCommitSchema = z.object({
    sha: z.string(),
    url: z.string().optional().nullable()
});

const ProviderBranchSchema = z.object({
    name: z.string(),
    commit: ProviderCommitSchema,
    protected: z.boolean(),
    protection_url: z.string().optional().nullable()
});

const OutputSchema = z
    .object({
        name: z.string().describe('The name of the branch.'),
        commit: z
            .object({
                sha: z.string().describe('The SHA of the latest commit on the branch.')
            })
            .describe('The latest commit on the branch.'),
        protected: z.boolean().describe('Whether the branch is protected.'),
        protection_url: z.string().optional().describe('The API URL for branch protection details, if the branch is protected.')
    })
    .describe('Details of a single branch, including its latest commit sha.');

/**
 * @tags: [read]
 * @tagReason: Retrieves branch metadata and the latest commit SHA from the GitHub API.
 * @pitfalls: The GitHub App installation token is scoped to explicitly selected repositories; branches in any other repository will fail with 404 or 403.
 */
const action = createAction({
    description: 'Get details of a single branch, including its latest commit sha.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['contents:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://docs.github.com/rest/branches/branches#get-a-branch
            endpoint: `/repos/${encodeURIComponent(input.owner)}/${encodeURIComponent(input.repo)}/branches/${encodeURIComponent(input.branch)}`,
            retries: 3
        });

        const providerBranch = ProviderBranchSchema.parse(response.data);

        return {
            name: providerBranch.name,
            commit: {
                sha: providerBranch.commit.sha
            },
            protected: providerBranch.protected,
            ...(providerBranch.protection_url != null && { protection_url: providerBranch.protection_url })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
