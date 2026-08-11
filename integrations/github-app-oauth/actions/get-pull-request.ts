import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        owner: z.string().describe('Repository owner. Example: "octocat"'),
        repo: z.string().describe('Repository name. Example: "Hello-World"'),
        pull_number: z.number().int().positive().describe('Pull request number. Example: 1')
    })
    .describe('Input parameters for retrieving a single pull request.');

const UserSchema = z.object({
    login: z.string().describe('User login name'),
    id: z.number().describe('User ID')
});

const LabelSchema = z.object({
    id: z.number().describe('Label ID'),
    name: z.string().describe('Label name'),
    color: z.string().describe('Label color')
});

const RefSchema = z.object({
    ref: z.string().describe('Branch reference name'),
    sha: z.string().describe('Commit SHA')
});

const OutputSchema = z
    .object({
        id: z.number().describe('Pull request ID'),
        number: z.number().describe('Pull request number'),
        title: z.string().describe('Pull request title'),
        state: z.string().describe('Pull request state. Example: "open" or "closed"'),
        draft: z.boolean().describe('Whether the pull request is a draft'),
        body: z.string().nullable().optional().describe('Pull request body content'),
        user: UserSchema.optional().describe('User who created the pull request'),
        labels: z.array(LabelSchema).optional().describe('Labels attached to the pull request'),
        head: RefSchema.optional().describe('The branch the pull request originates from'),
        base: RefSchema.optional().describe('The branch the pull request targets'),
        html_url: z.string().describe('URL to view the pull request in a browser'),
        created_at: z.string().describe('Creation timestamp in ISO 8601 format'),
        updated_at: z.string().describe('Last update timestamp in ISO 8601 format'),
        closed_at: z.string().nullable().optional().describe('Close timestamp in ISO 8601 format, or null if still open'),
        merged_at: z.string().nullable().optional().describe('Merge timestamp in ISO 8601 format, or null if not merged')
    })
    .describe('Details of a single pull request.');

const ProviderUserSchema = z.object({
    login: z.string(),
    id: z.number()
});

const ProviderLabelSchema = z.object({
    id: z.number(),
    name: z.string(),
    color: z.string()
});

const ProviderRefSchema = z.object({
    ref: z.string(),
    sha: z.string()
});

const ProviderPullRequestSchema = z.object({
    id: z.number(),
    number: z.number(),
    title: z.string(),
    state: z.string(),
    draft: z.boolean(),
    body: z.string().nullable().optional(),
    user: ProviderUserSchema.nullable().optional(),
    labels: z.array(ProviderLabelSchema).optional(),
    head: ProviderRefSchema.optional(),
    base: ProviderRefSchema.optional(),
    html_url: z.string(),
    created_at: z.string(),
    updated_at: z.string(),
    closed_at: z.string().nullable().optional(),
    merged_at: z.string().nullable().optional()
});

/**
 * @tags: [read]
 * @tagReason: Retrieves a single pull request by number without modifying any data.
 * @pitfalls: The state field only reports "open" or "closed"; rely on merged_at to distinguish merged PRs from merely closed ones.
 */
const action = createAction({
    description: 'Get details of a single pull request.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['pull_requests:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://docs.github.com/rest/pulls/pulls#get-a-pull-request
        const response = await nango.get({
            endpoint: `repos/${encodeURIComponent(input.owner)}/${encodeURIComponent(input.repo)}/pulls/${input.pull_number}`,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: `Pull request #${input.pull_number} not found in ${input.owner}/${input.repo}`,
                owner: input.owner,
                repo: input.repo,
                pull_number: input.pull_number
            });
        }

        const pr = ProviderPullRequestSchema.parse(response.data);

        return {
            id: pr.id,
            number: pr.number,
            title: pr.title,
            state: pr.state,
            draft: pr.draft,
            ...(pr.body !== undefined && { body: pr.body }),
            ...(pr.user && {
                user: {
                    login: pr.user.login,
                    id: pr.user.id
                }
            }),
            ...(pr.labels && {
                labels: pr.labels.map((label) => ({
                    id: label.id,
                    name: label.name,
                    color: label.color
                }))
            }),
            ...(pr.head && {
                head: {
                    ref: pr.head.ref,
                    sha: pr.head.sha
                }
            }),
            ...(pr.base && {
                base: {
                    ref: pr.base.ref,
                    sha: pr.base.sha
                }
            }),
            html_url: pr.html_url,
            created_at: pr.created_at,
            updated_at: pr.updated_at,
            ...(pr.closed_at !== undefined && { closed_at: pr.closed_at }),
            ...(pr.merged_at !== undefined && { merged_at: pr.merged_at })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
