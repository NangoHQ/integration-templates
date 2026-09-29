import { z } from 'zod';
import { createAction } from 'nango';

const OwnerSchema = z.object({
    login: z.string().describe('The username of the repository owner. Example: "octocat"'),
    id: z.number().describe('The unique identifier of the owner. Example: 1'),
    node_id: z.string().describe('The global node ID of the owner. Example: "MDQ6VXNlcjE="'),
    type: z.string().describe('The type of owner account. Example: "User" or "Organization"')
});

const PermissionsSchema = z.object({
    admin: z.boolean().describe('Whether the app has admin access to the repository'),
    push: z.boolean().describe('Whether the app has push access to the repository'),
    pull: z.boolean().describe('Whether the app has pull access to the repository')
});

const ProviderRepositorySchema = z.object({
    id: z.number(),
    node_id: z.string(),
    name: z.string(),
    full_name: z.string(),
    private: z.boolean(),
    owner: OwnerSchema,
    html_url: z.string(),
    description: z.string().nullable(),
    fork: z.boolean(),
    default_branch: z.string(),
    permissions: PermissionsSchema.optional()
});

const RepositorySchema = z
    .object({
        id: z.number().describe('The unique identifier of the repository. Example: 1296269'),
        node_id: z.string().describe('The global node ID of the repository. Example: "MDEwOlJlcG9zaXRvcnkxMjk2MjY5"'),
        name: z.string().describe('The name of the repository. Example: "Hello-World"'),
        full_name: z.string().describe('The full name of the repository including owner. Example: "octocat/Hello-World"'),
        private: z.boolean().describe('Whether the repository is private'),
        owner: OwnerSchema.describe('The owner of the repository'),
        html_url: z.string().describe('The URL to view the repository in a browser. Example: "https://github.com/octocat/Hello-World"'),
        description: z.string().optional().describe('The description of the repository'),
        fork: z.boolean().describe('Whether the repository is a fork'),
        default_branch: z.string().describe('The default branch name. Example: "main"'),
        permissions: PermissionsSchema.optional().describe('The permissions the app installation has on this repository')
    })
    .describe('A GitHub repository accessible to the app installation.');

const InputSchema = z
    .object({
        cursor: z.string().optional().describe('Pagination cursor. Pass a page number as a string for the first or subsequent pages.'),
        per_page: z.number().optional().describe('Number of results per page. GitHub defaults to 30 and allows up to 100.')
    })
    .describe('Input parameters for listing repositories accessible to a GitHub App installation.');

const OutputSchema = z
    .object({
        total_count: z.number().describe('The total number of repositories accessible to this installation. Example: 1'),
        repository_selection: z.enum(['all', 'selected']).describe('Whether the installation has access to all or only selected repositories'),
        repositories: z.array(RepositorySchema).describe('The list of repositories accessible to this installation'),
        next_page: z.string().optional().describe('The next page number to fetch, if more results are available')
    })
    .describe('Response containing repositories accessible to a GitHub App installation, total count, and pagination metadata.');

/**
 * @tags: [read]
 * @tagReason: Reads the list of repositories accessible to the GitHub App installation.
 * @pitfalls: Installations may return `repository_selection: "selected"`, so only explicitly granted repositories appear; do not assume a fixed repository is accessible without checking this list first.
 */
const action = createAction({
    description: 'List the repositories this GitHub App installation has access to',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const page = input.cursor ? parseInt(input.cursor, 10) : 1;
        if (Number.isNaN(page) || page < 1) {
            throw new nango.ActionError({
                type: 'invalid_input',
                message: 'cursor must be a valid positive integer page number'
            });
        }

        const perPage = input.per_page ?? 30;

        // https://docs.github.com/en/rest/apps/installations?apiVersion=2022-11-28#list-repositories-accessible-to-the-app-installation
        const response = await nango.get({
            endpoint: '/installation/repositories',
            params: {
                page: String(page),
                per_page: String(perPage)
            },
            retries: 3
        });

        const ProviderResponseSchema = z.object({
            total_count: z.number(),
            repository_selection: z.enum(['all', 'selected']),
            repositories: z.array(z.unknown())
        });

        const providerData = ProviderResponseSchema.parse(response.data);

        const repositories = providerData.repositories.map((repo: unknown) => {
            const parsed = ProviderRepositorySchema.parse(repo);
            return {
                id: parsed.id,
                node_id: parsed.node_id,
                name: parsed.name,
                full_name: parsed.full_name,
                private: parsed.private,
                owner: parsed.owner,
                html_url: parsed.html_url,
                ...(parsed.description != null && { description: parsed.description }),
                fork: parsed.fork,
                default_branch: parsed.default_branch,
                ...(parsed.permissions !== undefined && { permissions: parsed.permissions })
            };
        });

        const hasMore = page * perPage < providerData.total_count;

        return {
            total_count: providerData.total_count,
            repository_selection: providerData.repository_selection,
            repositories,
            ...(hasMore && { next_page: String(page + 1) })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
