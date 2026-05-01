import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    owner: z.string().describe('The account owner of the repository. Example: "octocat"'),
    repo: z.string().describe('The name of the repository. Example: "Hello-World"'),
    pull_number: z.number().int().positive().describe('The number that identifies the pull request. Example: 42'),
    title: z.string().optional().describe('The title of the pull request.'),
    body: z.string().nullable().optional().describe('The contents of the pull request.'),
    state: z.enum(['open', 'closed']).optional().describe('State of the pull request.'),
    base: z.string().optional().describe('The name of the branch you want the changes pulled into.'),
    maintainer_can_modify: z.boolean().optional().describe('Indicates whether maintainers can modify the pull request.')
});

const ProviderLabelSchema = z.object({
    id: z.number(),
    node_id: z.string(),
    url: z.string(),
    name: z.string(),
    description: z.string().nullable(),
    color: z.string(),
    default: z.boolean()
});

const ProviderUserSchema = z.object({
    login: z.string(),
    id: z.number(),
    node_id: z.string(),
    avatar_url: z.string(),
    gravatar_id: z.string().nullable(),
    url: z.string(),
    html_url: z.string(),
    type: z.string(),
    site_admin: z.boolean()
});

const ProviderSimpleUserSchema = z.object({
    login: z.string(),
    id: z.number(),
    node_id: z.string(),
    avatar_url: z.string(),
    gravatar_id: z.string().nullable(),
    url: z.string(),
    html_url: z.string(),
    followers_url: z.string(),
    following_url: z.string(),
    gists_url: z.string(),
    starred_url: z.string(),
    subscriptions_url: z.string(),
    organizations_url: z.string(),
    repos_url: z.string(),
    events_url: z.string(),
    received_events_url: z.string(),
    type: z.string(),
    site_admin: z.boolean()
});

const ProviderBaseSchema = z.object({
    label: z.string(),
    ref: z.string(),
    sha: z.string(),
    user: ProviderSimpleUserSchema.nullable()
});

const ProviderPullSchema = z.object({
    url: z.string(),
    id: z.number(),
    node_id: z.string(),
    html_url: z.string(),
    diff_url: z.string(),
    patch_url: z.string(),
    issue_url: z.string(),
    commits_url: z.string(),
    review_comments_url: z.string(),
    review_comment_url: z.string(),
    comments_url: z.string(),
    statuses_url: z.string(),
    number: z.number(),
    state: z.enum(['open', 'closed']),
    locked: z.boolean(),
    title: z.string(),
    user: ProviderUserSchema.nullable(),
    body: z.string().nullable(),
    labels: z.array(ProviderLabelSchema),
    created_at: z.string(),
    updated_at: z.string(),
    closed_at: z.string().nullable(),
    merged_at: z.string().nullable(),
    merge_commit_sha: z.string().nullable(),
    assignee: ProviderSimpleUserSchema.nullable(),
    assignees: z.array(ProviderSimpleUserSchema),
    requested_reviewers: z.array(ProviderSimpleUserSchema),
    head: ProviderBaseSchema,
    base: ProviderBaseSchema,
    author_association: z.string(),
    draft: z.boolean()
});

interface PatchPayload {
    title?: string;
    body?: string | null;
    state?: 'open' | 'closed';
    base?: string;
    maintainer_can_modify?: boolean;
}

const OutputSchema = z.object({
    id: z.number(),
    number: z.number(),
    state: z.enum(['open', 'closed']),
    title: z.string(),
    body: z.string().optional(),
    html_url: z.string(),
    user: z
        .object({
            login: z.string(),
            id: z.number()
        })
        .optional(),
    created_at: z.string(),
    updated_at: z.string(),
    closed_at: z.string().optional(),
    merged_at: z.string().optional(),
    head: z.object({
        ref: z.string(),
        sha: z.string()
    }),
    base: z.object({
        ref: z.string(),
        sha: z.string()
    }),
    draft: z.boolean()
});

const action = createAction({
    description: "Edit a pull request's title, body, base branch, or state.",
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/update-pull-request',
        group: 'Pull Requests'
    },
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const payload: PatchPayload = {};

        if (input.title !== undefined) {
            payload['title'] = input.title;
        }
        if (input.body !== undefined) {
            payload['body'] = input.body;
        }
        if (input.state !== undefined) {
            payload['state'] = input.state;
        }
        if (input.base !== undefined) {
            payload['base'] = input.base;
        }
        if (input.maintainer_can_modify !== undefined) {
            payload['maintainer_can_modify'] = input.maintainer_can_modify;
        }

        // https://docs.github.com/en/rest/pulls/pulls#update-a-pull-request
        const response = await nango.patch({
            endpoint: `/repos/${encodeURIComponent(input.owner)}/${encodeURIComponent(input.repo)}/pulls/${input.pull_number}`,
            data: payload,
            retries: 3
        });

        const providerPull = ProviderPullSchema.parse(response.data);

        return {
            id: providerPull.id,
            number: providerPull.number,
            state: providerPull.state,
            title: providerPull.title,
            ...(providerPull.body != null && { body: providerPull.body }),
            html_url: providerPull.html_url,
            ...(providerPull.user != null && {
                user: {
                    login: providerPull.user.login,
                    id: providerPull.user.id
                }
            }),
            created_at: providerPull.created_at,
            updated_at: providerPull.updated_at,
            ...(providerPull.closed_at != null && { closed_at: providerPull.closed_at }),
            ...(providerPull.merged_at != null && { merged_at: providerPull.merged_at }),
            head: {
                ref: providerPull.head.ref,
                sha: providerPull.head.sha
            },
            base: {
                ref: providerPull.base.ref,
                sha: providerPull.base.sha
            },
            draft: providerPull.draft
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
