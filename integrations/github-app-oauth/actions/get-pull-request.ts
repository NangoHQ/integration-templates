import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        owner: z.string().describe('Repository owner username or organization name.'),
        repo: z.string().describe('Repository name.'),
        pull_number: z.number().describe('Pull request number.')
    })
    .describe('Input to get a single pull request.');

const ProviderUserSchema = z.object({
    login: z.string(),
    id: z.number(),
    html_url: z.string(),
    type: z.string()
});

const ProviderHeadBaseSchema = z.object({
    ref: z.string(),
    sha: z.string()
});

const ProviderPullRequestSchema = z.object({
    id: z.number(),
    number: z.number(),
    state: z.string(),
    title: z.string(),
    body: z.string().nullable(),
    draft: z.boolean(),
    html_url: z.string(),
    created_at: z.string(),
    updated_at: z.string(),
    closed_at: z.string().nullable(),
    merged_at: z.string().nullable(),
    merge_commit_sha: z.string().nullable(),
    user: ProviderUserSchema,
    head: ProviderHeadBaseSchema,
    base: ProviderHeadBaseSchema
});

const OutputUserSchema = z.object({
    login: z.string().describe('GitHub username of the pull request author.'),
    id: z.number().describe('GitHub user ID of the pull request author.'),
    html_url: z.string().describe("URL to the author's GitHub profile."),
    type: z.string().describe('Type of GitHub user, e.g. User or Organization.')
});

const OutputHeadBaseSchema = z.object({
    ref: z.string().describe('Git ref name for the branch.'),
    sha: z.string().describe('SHA of the commit at the tip of the branch.')
});

const OutputSchema = z
    .object({
        id: z.number().describe('Unique pull request ID.'),
        number: z.number().describe('Pull request number within the repository.'),
        state: z.string().describe('State of the pull request: open, closed.'),
        title: z.string().describe('Title of the pull request.'),
        body: z.string().optional().describe('Body content of the pull request.'),
        draft: z.boolean().describe('Whether the pull request is a draft.'),
        html_url: z.string().describe('URL to view the pull request on GitHub.'),
        created_at: z.string().describe('ISO 8601 timestamp when the pull request was created.'),
        updated_at: z.string().describe('ISO 8601 timestamp when the pull request was last updated.'),
        closed_at: z.string().optional().describe('ISO 8601 timestamp when the pull request was closed, if applicable.'),
        merged_at: z.string().optional().describe('ISO 8601 timestamp when the pull request was merged, if applicable.'),
        merge_commit_sha: z.string().optional().describe('SHA of the merge commit, if the pull request was merged.'),
        user: OutputUserSchema.describe('Author of the pull request.'),
        head: OutputHeadBaseSchema.describe('Source branch of the pull request.'),
        base: OutputHeadBaseSchema.describe('Target branch of the pull request.')
    })
    .describe('Output of a single pull request.');

/**
 * @tags: [read]
 * @tagReason: Reads a single pull request from the GitHub API.
 */
const action = createAction({
    description: 'Get details of a single pull request.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['pull_requests:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://docs.github.com/en/rest/pulls/pulls#get-a-pull-request
        const response = await nango.get({
            endpoint: `/repos/${encodeURIComponent(input.owner)}/${encodeURIComponent(input.repo)}/pulls/${encodeURIComponent(String(input.pull_number))}`,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Pull request not found',
                owner: input.owner,
                repo: input.repo,
                pull_number: input.pull_number
            });
        }

        const providerPr = ProviderPullRequestSchema.parse(response.data);

        return {
            id: providerPr.id,
            number: providerPr.number,
            state: providerPr.state,
            title: providerPr.title,
            ...(providerPr.body != null && { body: providerPr.body }),
            draft: providerPr.draft,
            html_url: providerPr.html_url,
            created_at: providerPr.created_at,
            updated_at: providerPr.updated_at,
            ...(providerPr.closed_at != null && { closed_at: providerPr.closed_at }),
            ...(providerPr.merged_at != null && { merged_at: providerPr.merged_at }),
            ...(providerPr.merge_commit_sha != null && { merge_commit_sha: providerPr.merge_commit_sha }),
            user: {
                login: providerPr.user.login,
                id: providerPr.user.id,
                html_url: providerPr.user.html_url,
                type: providerPr.user.type
            },
            head: {
                ref: providerPr.head.ref,
                sha: providerPr.head.sha
            },
            base: {
                ref: providerPr.base.ref,
                sha: providerPr.base.sha
            }
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
