import { z } from 'zod';
import { createAction, ProxyConfiguration } from 'nango';

const InputSchema = z
    .object({
        owner: z.string().describe('Repository owner login. Example: "octocat".'),
        repo: z.string().describe('Repository name. Example: "Hello-World".'),
        pull_number: z.number().describe('Pull request number to update. Example: 1.'),
        title: z.string().optional().describe('New title for the pull request.'),
        body: z.string().nullable().optional().describe('New body for the pull request. Pass null to clear the body.'),
        state: z.enum(['open', 'closed']).optional().describe('New state for the pull request. Either "open" or "closed".'),
        base: z.string().optional().describe('New base branch name for the pull request.')
    })
    .describe('Input parameters to update a pull request.');

const ProviderUserSchema = z.object({
    login: z.string(),
    id: z.number()
});

const ProviderHeadBaseSchema = z.object({
    ref: z.string(),
    sha: z.string()
});

const ProviderPullRequestSchema = z.object({
    number: z.number(),
    title: z.string(),
    body: z.string().nullable(),
    state: z.string(),
    html_url: z.string(),
    user: ProviderUserSchema,
    head: ProviderHeadBaseSchema,
    base: ProviderHeadBaseSchema,
    created_at: z.string(),
    updated_at: z.string(),
    draft: z.boolean()
});

const OutputSchema = z
    .object({
        number: z.number().describe('Pull request number.'),
        title: z.string().describe('Pull request title.'),
        body: z.string().optional().describe('Pull request body. Omitted when null.'),
        state: z.string().describe('Pull request state. Either "open" or "closed".'),
        html_url: z.string().describe('URL to view the pull request in a browser.'),
        user: z
            .object({
                login: z.string().describe('GitHub username of the PR author.'),
                id: z.number().describe('GitHub user ID of the PR author.')
            })
            .describe('User who created the pull request.'),
        head: z
            .object({
                ref: z.string().describe('Name of the branch the PR changes come from.'),
                sha: z.string().describe('SHA of the head commit.')
            })
            .describe('The branch that contains the changes.'),
        base: z
            .object({
                ref: z.string().describe('Name of the branch the PR targets.'),
                sha: z.string().describe('SHA of the base commit.')
            })
            .describe('The branch the PR targets.'),
        created_at: z.string().describe('ISO 8601 timestamp when the PR was created.'),
        updated_at: z.string().describe('ISO 8601 timestamp when the PR was last updated.'),
        draft: z.boolean().describe('Whether the PR is a draft.')
    })
    .describe('The updated pull request.');

/**
 * @tags: [write]
 * @tagReason: Mutates the pull request by patching its title, body, state, or base branch.
 * @pitfalls: Closing a PR with state "closed" does not merge it; reopening a closed PR fails if its head branch has been deleted.
 */
const action = createAction({
    description: "Update a pull request's title, body, state, or base branch.",
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['pull_requests:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://docs.github.com/en/rest/pulls/pulls#update-a-pull-request
            endpoint: `/repos/${encodeURIComponent(input.owner)}/${encodeURIComponent(input.repo)}/pulls/${input.pull_number}`,
            data: {
                ...(input.title !== undefined && { title: input.title }),
                ...(input.body !== undefined && { body: input.body }),
                ...(input.state !== undefined && { state: input.state }),
                ...(input.base !== undefined && { base: input.base })
            },
            retries: 3
        };

        const response = await nango.patch(config);

        const providerPull = ProviderPullRequestSchema.parse(response.data);

        return {
            number: providerPull.number,
            title: providerPull.title,
            ...(providerPull.body !== null && { body: providerPull.body }),
            state: providerPull.state,
            html_url: providerPull.html_url,
            user: providerPull.user,
            head: providerPull.head,
            base: providerPull.base,
            created_at: providerPull.created_at,
            updated_at: providerPull.updated_at,
            draft: providerPull.draft
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
