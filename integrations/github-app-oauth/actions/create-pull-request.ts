import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        owner: z.string().describe('The account owner of the repository. The name is not case sensitive.'),
        repo: z.string().describe('The name of the repository without the .git extension. The name is not case sensitive.'),
        title: z.string().describe('The title of the new pull request.'),
        head: z
            .string()
            .describe(
                'The name of the branch where your changes are implemented. For cross-repository pull requests in the same network, namespace head with a user like this: username:branch.'
            ),
        base: z.string().describe('The name of the branch you want the changes pulled into. This should be an existing branch on the current repository.'),
        body: z.string().optional().describe('The contents of the pull request.'),
        draft: z.boolean().optional().describe('Indicates whether the pull request is a draft.')
    })
    .describe('Input for creating a new pull request.');

const PullRequestRefSchema = z.object({
    label: z.string().describe('The label of the reference.'),
    ref: z.string().describe('The name of the branch.'),
    sha: z.string().describe('The SHA of the commit.'),
    repo: z.object({}).passthrough().describe('The repository object for the reference.')
});

const OutputSchema = z
    .object({
        id: z.number().describe('The unique identifier of the pull request.'),
        number: z.number().describe('The number of the pull request in the repository.'),
        issue_url: z.string().describe("The API location of this pull request's issue."),
        title: z.string().describe('The title of the pull request.'),
        state: z.string().describe('The state of the pull request. Either open or closed.'),
        html_url: z.string().describe('The HTML location of this pull request.'),
        url: z.string().describe('The API location of this pull request.'),
        created_at: z.string().describe('The date and time the pull request was created.'),
        updated_at: z.string().describe('The date and time the pull request was last updated.'),
        draft: z.boolean().optional().describe('Whether the pull request is a draft.'),
        head: PullRequestRefSchema.describe('The head branch of the pull request.'),
        base: PullRequestRefSchema.describe('The base branch of the pull request.'),
        body: z.string().optional().describe('The contents of the pull request.')
    })
    .describe('Output of a newly created pull request.');

/**
 * @tags: [write]
 * @tagReason: Creates a new pull request on the provider.
 * @pitfalls: GitHub rejects the request with 422 if a pull request already exists for the same head and base branches or if there are no commits between them.
 */
const action = createAction({
    description: 'Create a new pull request.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['pull_requests:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://docs.github.com/en/rest/pulls/pulls#create-a-pull-request
            endpoint: `/repos/${encodeURIComponent(input.owner)}/${encodeURIComponent(input.repo)}/pulls`,
            data: {
                title: input.title,
                head: input.head,
                base: input.base,
                ...(input.body !== undefined && { body: input.body }),
                ...(input.draft !== undefined && { draft: input.draft })
            },
            retries: 10
        });

        const providerPullRequest = z
            .object({
                id: z.number(),
                number: z.number(),
                issue_url: z.string(),
                title: z.string(),
                state: z.string(),
                html_url: z.string(),
                url: z.string(),
                created_at: z.string(),
                updated_at: z.string(),
                draft: z.boolean().nullish(),
                head: z.object({
                    label: z.string(),
                    ref: z.string(),
                    sha: z.string(),
                    repo: z.object({}).passthrough()
                }),
                base: z.object({
                    label: z.string(),
                    ref: z.string(),
                    sha: z.string(),
                    repo: z.object({}).passthrough()
                }),
                body: z.string().nullable()
            })
            .parse(response.data);

        return {
            id: providerPullRequest.id,
            number: providerPullRequest.number,
            issue_url: providerPullRequest.issue_url,
            title: providerPullRequest.title,
            state: providerPullRequest.state,
            html_url: providerPullRequest.html_url,
            url: providerPullRequest.url,
            created_at: providerPullRequest.created_at,
            updated_at: providerPullRequest.updated_at,
            ...(providerPullRequest.draft != null && { draft: providerPullRequest.draft }),
            head: providerPullRequest.head,
            base: providerPullRequest.base,
            ...(providerPullRequest.body != null && { body: providerPullRequest.body })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
