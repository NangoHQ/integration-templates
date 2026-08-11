import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        owner: z.string().describe('Account owner of the repository. Example: "octocat"'),
        repo: z.string().describe('Name of the repository. Example: "hello-world"')
    })
    .describe('Input for retrieving a GitHub repository');

const OutputSchema = z
    .object({
        id: z.number().describe('Unique numeric repository identifier'),
        name: z.string().describe('Repository name'),
        full_name: z.string().describe('Full repository name including owner. Example: "octocat/hello-world"'),
        description: z.string().optional().describe('Repository description'),
        html_url: z.string().describe('URL to view the repository in a browser'),
        url: z.string().describe('API URL for this repository'),
        default_branch: z.string().describe('Default branch name. Example: "main"'),
        language: z.string().nullable().optional().describe('Primary programming language'),
        forks_count: z.number().describe('Number of forks'),
        stargazers_count: z.number().describe('Number of stars'),
        watchers_count: z.number().describe('Number of watchers'),
        open_issues_count: z.number().describe('Number of open issues'),
        private: z.boolean().describe('Whether the repository is private'),
        created_at: z.string().describe('ISO 8601 timestamp of creation'),
        updated_at: z.string().describe('ISO 8601 timestamp of last update')
    })
    .describe('Details of a GitHub repository');

/**
 * @tags: [read]
 * @tagReason: Performs a single read-only GET to the GitHub Repositories API.
 * @pitfalls: Inaccessible repositories return 404 instead of 403, so callers cannot distinguish a missing repository from one the installation cannot access.
 */
const action = createAction({
    description: 'Get details of a repository',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['metadata:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://docs.github.com/rest/repos/repos#get-a-repository
            endpoint: `repos/${encodeURIComponent(input.owner)}/${encodeURIComponent(input.repo)}`,
            retries: 3
        });

        const providerRepo = z
            .object({
                id: z.number(),
                name: z.string(),
                full_name: z.string(),
                description: z.string().nullable().optional(),
                html_url: z.string(),
                url: z.string(),
                default_branch: z.string(),
                language: z.string().nullable().optional(),
                forks_count: z.number(),
                stargazers_count: z.number(),
                watchers_count: z.number(),
                open_issues_count: z.number(),
                private: z.boolean(),
                created_at: z.string(),
                updated_at: z.string()
            })
            .parse(response.data);

        return {
            id: providerRepo.id,
            name: providerRepo.name,
            full_name: providerRepo.full_name,
            ...(providerRepo.description != null && { description: providerRepo.description }),
            html_url: providerRepo.html_url,
            url: providerRepo.url,
            default_branch: providerRepo.default_branch,
            ...(providerRepo.language != null && { language: providerRepo.language }),
            forks_count: providerRepo.forks_count,
            stargazers_count: providerRepo.stargazers_count,
            watchers_count: providerRepo.watchers_count,
            open_issues_count: providerRepo.open_issues_count,
            private: providerRepo.private,
            created_at: providerRepo.created_at,
            updated_at: providerRepo.updated_at
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
