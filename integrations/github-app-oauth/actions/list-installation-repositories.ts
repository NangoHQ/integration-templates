import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        per_page: z.number().min(1).max(100).optional().describe('Number of repositories to return per page (1-100). Defaults to 30.'),
        page: z.number().min(1).optional().describe('Page number for pagination. Defaults to 1.')
    })
    .describe('Input for listing repositories accessible to the GitHub App installation.');

const RepositorySchema = z
    .object({
        id: z.number().describe('Unique repository ID.'),
        node_id: z.string().describe('Global node ID.'),
        name: z.string().describe('Repository name.'),
        full_name: z.string().describe('Full repository name including owner (e.g., "owner/repo").'),
        private: z.boolean().describe('Whether the repository is private.'),
        owner: z
            .object({
                login: z.string().describe('Owner login/username.'),
                id: z.number().describe('Owner account ID.'),
                node_id: z.string().describe('Owner global node ID.'),
                type: z.string().describe('Owner account type (e.g., "User" or "Organization").')
            })
            .passthrough()
            .describe('Repository owner information.'),
        html_url: z.string().describe('URL to view the repository in a browser.'),
        description: z.string().nullable().describe('Repository description.'),
        fork: z.boolean().describe('Whether this repository is a fork.'),
        url: z.string().describe('API URL for this repository.'),
        created_at: z.string().describe('Creation timestamp in ISO 8601 format.'),
        updated_at: z.string().describe('Last update timestamp in ISO 8601 format.'),
        pushed_at: z.string().nullable().describe('Last push timestamp in ISO 8601 format.'),
        homepage: z.string().nullable().describe('Repository homepage URL.'),
        size: z.number().describe('Repository size in kilobytes.'),
        stargazers_count: z.number().describe('Number of stars.'),
        watchers_count: z.number().describe('Number of watchers.'),
        language: z.string().nullable().describe('Primary programming language.'),
        forks_count: z.number().describe('Number of forks.'),
        open_issues_count: z.number().describe('Number of open issues.'),
        default_branch: z.string().describe('Default branch name.')
    })
    .passthrough()
    .describe('GitHub repository object.');

const OutputSchema = z
    .object({
        total_count: z.number().describe('Total number of repositories accessible to the installation.'),
        repository_selection: z.enum(['all', 'selected']).describe('Whether the installation has access to all repositories or only selected ones.'),
        repositories: z.array(RepositorySchema).describe('Array of repositories accessible to this installation.')
    })
    .describe('Output containing repositories accessible to the GitHub App installation.');

/**
 * @tags: [read]
 * @tagReason: Lists repositories accessible to the GitHub App installation via a read-only endpoint.
 * @pitfalls: A returned repository may have disabled features (for example issues or discussions) independently of installation permissions, so downstream write actions can still fail on it.
 */
const action = createAction({
    description: 'List the repositories this GitHub App installation has access to.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://docs.github.com/rest/reference/apps#list-repositories-accessible-to-the-app-installation
        const response = await nango.get({
            endpoint: '/installation/repositories',
            params: {
                ...(input.per_page !== undefined && { per_page: String(input.per_page) }),
                ...(input.page !== undefined && { page: String(input.page) })
            },
            retries: 3
        });

        const providerResponse = z
            .object({
                total_count: z.number(),
                repository_selection: z.enum(['all', 'selected']),
                repositories: z.array(z.unknown())
            })
            .parse(response.data);

        const repositories = providerResponse.repositories.map((repo) => RepositorySchema.parse(repo));

        return {
            total_count: providerResponse.total_count,
            repository_selection: providerResponse.repository_selection,
            repositories
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
