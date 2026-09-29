import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        owner: z.string().describe('The account owner of the repository. Example: "octocat"'),
        repo: z.string().describe('The name of the repository. Example: "Hello-World"')
    })
    .describe('Input parameters to identify a GitHub repository.');

const ProviderRepositorySchema = z.object({
    id: z.number(),
    node_id: z.string(),
    name: z.string(),
    full_name: z.string(),
    owner: z.object({
        login: z.string(),
        id: z.number(),
        node_id: z.string(),
        avatar_url: z.string(),
        type: z.string()
    }),
    private: z.boolean(),
    html_url: z.string(),
    description: z.string().nullable(),
    fork: z.boolean(),
    url: z.string(),
    created_at: z.string(),
    updated_at: z.string(),
    pushed_at: z.string(),
    homepage: z.string().nullable(),
    size: z.number(),
    stargazers_count: z.number(),
    watchers_count: z.number(),
    language: z.string().nullable(),
    forks_count: z.number(),
    open_issues_count: z.number(),
    default_branch: z.string(),
    permissions: z
        .object({
            admin: z.boolean(),
            push: z.boolean(),
            pull: z.boolean()
        })
        .optional(),
    topics: z.array(z.string()).optional(),
    archived: z.boolean(),
    disabled: z.boolean(),
    visibility: z.string().optional()
});

const OutputSchema = z
    .object({
        id: z.number().describe('The unique identifier of the repository.'),
        node_id: z.string().describe('The global node ID of the repository.'),
        name: z.string().describe('The name of the repository.'),
        full_name: z.string().describe('The full name of the repository, including the owner.'),
        owner: z
            .object({
                login: z.string().describe('The username of the repository owner.'),
                id: z.number().describe('The unique identifier of the repository owner.'),
                node_id: z.string().describe('The global node ID of the repository owner.'),
                avatar_url: z.string().describe("The URL of the owner's avatar image."),
                type: z.string().describe('The type of the owner account, such as "User" or "Organization".')
            })
            .describe('The owner of the repository.'),
        private: z.boolean().describe('Whether the repository is private.'),
        html_url: z.string().describe('The URL to view the repository in a browser.'),
        description: z.string().optional().describe('The description of the repository, if any.'),
        fork: z.boolean().describe('Whether the repository is a fork.'),
        url: z.string().describe('The API URL for the repository.'),
        created_at: z.string().describe('The ISO 8601 timestamp when the repository was created.'),
        updated_at: z.string().describe('The ISO 8601 timestamp when the repository was last updated.'),
        pushed_at: z.string().describe('The ISO 8601 timestamp of the most recent push to the repository.'),
        homepage: z.string().optional().describe('The URL of the repository homepage, if any.'),
        size: z.number().describe('The size of the repository in kilobytes.'),
        stargazers_count: z.number().describe('The number of stargazers for the repository.'),
        watchers_count: z.number().describe('The number of watchers for the repository.'),
        language: z.string().optional().describe('The primary language of the repository, if any.'),
        forks_count: z.number().describe('The number of forks of the repository.'),
        open_issues_count: z.number().describe('The number of open issues in the repository.'),
        default_branch: z.string().describe('The name of the default branch.'),
        permissions: z
            .object({
                admin: z.boolean().describe('Whether the app has admin permissions on the repository.'),
                push: z.boolean().describe('Whether the app has push permissions on the repository.'),
                pull: z.boolean().describe('Whether the app has pull permissions on the repository.')
            })
            .optional()
            .describe('The permissions the requesting app has for the repository.'),
        topics: z.array(z.string()).optional().describe('The topics associated with the repository.'),
        archived: z.boolean().describe('Whether the repository is archived.'),
        disabled: z.boolean().describe('Whether the repository is disabled.'),
        visibility: z.string().optional().describe('The visibility of the repository, such as "public" or "private".')
    })
    .describe('Metadata for a GitHub repository.');

/**
 * @tags: [read]
 * @tagReason: Retrieves repository metadata via a single GET call.
 */
const action = createAction({
    description: 'Get details of a repository.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['metadata:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://docs.github.com/en/rest/repos/repos#get-a-repository
        const response = await nango.get({
            endpoint: `repos/${encodeURIComponent(input.owner)}/${encodeURIComponent(input.repo)}`,
            retries: 3
        });

        const repo = ProviderRepositorySchema.parse(response.data);

        return {
            id: repo.id,
            node_id: repo.node_id,
            name: repo.name,
            full_name: repo.full_name,
            owner: {
                login: repo.owner.login,
                id: repo.owner.id,
                node_id: repo.owner.node_id,
                avatar_url: repo.owner.avatar_url,
                type: repo.owner.type
            },
            private: repo.private,
            html_url: repo.html_url,
            ...(repo.description != null && { description: repo.description }),
            fork: repo.fork,
            url: repo.url,
            created_at: repo.created_at,
            updated_at: repo.updated_at,
            pushed_at: repo.pushed_at,
            ...(repo.homepage != null && { homepage: repo.homepage }),
            size: repo.size,
            stargazers_count: repo.stargazers_count,
            watchers_count: repo.watchers_count,
            ...(repo.language != null && { language: repo.language }),
            forks_count: repo.forks_count,
            open_issues_count: repo.open_issues_count,
            default_branch: repo.default_branch,
            ...(repo.permissions !== undefined && { permissions: repo.permissions }),
            ...(repo.topics !== undefined && { topics: repo.topics }),
            archived: repo.archived,
            disabled: repo.disabled,
            ...(repo.visibility !== undefined && { visibility: repo.visibility })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
