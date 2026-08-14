import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        owner: z.string().describe('Repository owner. Example: "nango-provisioned-apps"'),
        repo: z.string().describe('Repository name. Example: "nango"'),
        title: z.string().describe('Title of the pull request.'),
        head: z
            .string()
            .describe('The name of the branch where your changes are implemented. For cross-repository pull requests use the format "owner:branch".'),
        base: z.string().describe('The name of the branch you want the changes pulled into.'),
        body: z.string().optional().describe('Contents of the pull request body.'),
        draft: z.boolean().optional().describe('Whether the pull request should be created as a draft.')
    })
    .describe('Input for creating a new pull request.');

const ProviderPullRequestSchema = z.object({
    id: z.number(),
    number: z.number(),
    title: z.string(),
    state: z.string(),
    html_url: z.string(),
    issue_url: z.string(),
    head: z.object({
        ref: z.string(),
        sha: z.string()
    }),
    base: z.object({
        ref: z.string(),
        sha: z.string()
    }),
    user: z.object({
        login: z.string(),
        id: z.number()
    }),
    body: z.string().nullable(),
    draft: z.boolean()
});

const OutputSchema = z
    .object({
        id: z.number().describe('Unique identifier of the pull request.'),
        number: z.number().describe('Number of the pull request in the repository.'),
        title: z.string().describe('Title of the pull request.'),
        state: z.string().describe('State of the pull request, such as "open" or "closed".'),
        html_url: z.string().describe('URL to view the pull request in a browser.'),
        issue_url: z.string().describe('URL of the associated issue resource.'),
        head: z
            .object({
                ref: z.string().describe('Name of the head branch.'),
                sha: z.string().describe('SHA of the head commit.')
            })
            .describe('Head branch information.'),
        base: z
            .object({
                ref: z.string().describe('Name of the base branch.'),
                sha: z.string().describe('SHA of the base commit.')
            })
            .describe('Base branch information.'),
        user: z
            .object({
                login: z.string().describe('Username of the pull request creator.'),
                id: z.number().describe('Unique identifier of the pull request creator.')
            })
            .describe('User who created the pull request.'),
        body: z.string().optional().describe('Contents of the pull request body.'),
        draft: z.boolean().describe('Whether the pull request is a draft.')
    })
    .describe('Output of a newly created pull request.');

/**
 * @tags: [write]
 * @tagReason: Creates a new pull request on the provider.
 * @pitfalls: GitHub rejects the request with 422 if a pull request already exists for the same head and base branches, or if the head branch has no commits ahead of the base branch. The returned number and issue_url share the Issues API numbering, so downstream comments and reviews use the same issue number.
 */
const action = createAction({
    description: 'Create a new pull request.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['pull_requests:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://docs.github.com/rest/pulls/pulls#create-a-pull-request
            endpoint: `/repos/${encodeURIComponent(input.owner)}/${encodeURIComponent(input.repo)}/pulls`,
            data: {
                title: input.title,
                head: input.head,
                base: input.base,
                ...(input.body !== undefined && { body: input.body }),
                ...(input.draft !== undefined && { draft: input.draft })
            },
            retries: 3
        });

        const providerPullRequest = ProviderPullRequestSchema.parse(response.data);

        return {
            id: providerPullRequest.id,
            number: providerPullRequest.number,
            title: providerPullRequest.title,
            state: providerPullRequest.state,
            html_url: providerPullRequest.html_url,
            issue_url: providerPullRequest.issue_url,
            head: {
                ref: providerPullRequest.head.ref,
                sha: providerPullRequest.head.sha
            },
            base: {
                ref: providerPullRequest.base.ref,
                sha: providerPullRequest.base.sha
            },
            user: {
                login: providerPullRequest.user.login,
                id: providerPullRequest.user.id
            },
            ...(providerPullRequest.body != null && { body: providerPullRequest.body }),
            draft: providerPullRequest.draft
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
