import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        owner: z.string().describe('Repository owner login. Example: "octocat"'),
        repo: z.string().describe('Repository name. Example: "Hello-World"'),
        pull_number: z.number().describe('Pull request number. Example: 1'),
        title: z.string().optional().describe('New title for the pull request.'),
        body: z.string().optional().describe('New body content for the pull request.'),
        state: z.enum(['open', 'closed']).optional().describe('New state for the pull request.'),
        base: z.string().optional().describe('New base branch name for the pull request.')
    })
    .describe('Input for updating a pull request.');

const ProviderPullSchema = z.object({
    number: z.number(),
    title: z.string(),
    body: z.string().nullable(),
    state: z.string(),
    base: z.object({
        ref: z.string()
    }),
    head: z.object({
        ref: z.string()
    }),
    html_url: z.string(),
    created_at: z.string(),
    updated_at: z.string(),
    user: z.object({
        login: z.string()
    }),
    draft: z.boolean(),
    merged: z.boolean()
});

const OutputSchema = z
    .object({
        number: z.number().describe('Pull request number.'),
        title: z.string().describe('Pull request title.'),
        body: z.string().optional().describe('Pull request body content.'),
        state: z.string().describe('Pull request state.'),
        base_ref: z.string().describe('Base branch name.'),
        head_ref: z.string().describe('Head branch name.'),
        html_url: z.string().describe('URL to view the pull request in a browser.'),
        created_at: z.string().describe('ISO 8601 timestamp when the pull request was created.'),
        updated_at: z.string().describe('ISO 8601 timestamp when the pull request was last updated.'),
        user_login: z.string().describe('Login of the pull request author.'),
        draft: z.boolean().describe('Whether the pull request is a draft.'),
        merged: z.boolean().describe('Whether the pull request has been merged.')
    })
    .describe('Output of an updated pull request.');

/**
 * @tags: [write]
 * @tagReason: Mutates an existing pull request via PATCH.
 * @pitfalls: Closing a PR via state does not merge it. Changing the base branch fails when the new base and the PR head have merge conflicts.
 */
const action = createAction({
    description: "Update a pull request's title, body, state, or base branch.",
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['pull_requests:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://docs.github.com/rest/pulls/pulls#update-a-pull-request
        const response = await nango.patch({
            endpoint: `/repos/${encodeURIComponent(input.owner)}/${encodeURIComponent(input.repo)}/pulls/${input.pull_number}`,
            data: {
                ...(input.title !== undefined && { title: input.title }),
                ...(input.body !== undefined && { body: input.body }),
                ...(input.state !== undefined && { state: input.state }),
                ...(input.base !== undefined && { base: input.base })
            },
            retries: 3
        });

        const providerPull = ProviderPullSchema.parse(response.data);

        return {
            number: providerPull.number,
            title: providerPull.title,
            state: providerPull.state,
            base_ref: providerPull.base.ref,
            head_ref: providerPull.head.ref,
            html_url: providerPull.html_url,
            created_at: providerPull.created_at,
            updated_at: providerPull.updated_at,
            user_login: providerPull.user.login,
            draft: providerPull.draft,
            merged: providerPull.merged,
            ...(providerPull.body != null && { body: providerPull.body })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
