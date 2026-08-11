import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        owner: z.string().describe('Repository owner. Example: "nango-provisioned-apps"'),
        repo: z.string().describe('Repository name. Example: "nango"'),
        issue_or_pr_number: z.number().describe('Issue or pull request number. Example: 1'),
        per_page: z.number().int().min(1).max(100).optional().describe('Number of results per page. Maximum: 100.'),
        cursor: z.string().optional().describe('Pagination cursor (page number). Omit for the first page.')
    })
    .describe('Input for listing issue or pull request comments.');

const CommentUserSchema = z.object({
    login: z.string().describe('Username of the comment author.'),
    id: z.number().describe('User ID of the comment author.')
});

const CommentSchema = z.object({
    id: z.number().describe('Comment ID.'),
    body: z.string().describe('Comment body text.'),
    user: CommentUserSchema.optional().describe('User who created the comment, when known.'),
    created_at: z.string().describe('ISO 8601 timestamp when the comment was created.'),
    updated_at: z.string().describe('ISO 8601 timestamp when the comment was last updated.'),
    html_url: z.string().describe('URL to view the comment on GitHub.')
});

const OutputSchema = z
    .object({
        comments: z.array(CommentSchema).describe('List of comments on the issue or pull request.'),
        next_page: z.string().optional().describe('Page number for the next page of results. Omit if there are no more pages.')
    })
    .describe('Output for listing issue or pull request comments.');

const ProviderCommentSchema = z.object({
    id: z.number(),
    body: z.string(),
    user: z
        .object({
            login: z.string(),
            id: z.number()
        })
        .nullable()
        .optional(),
    created_at: z.string(),
    updated_at: z.string(),
    html_url: z.string()
});

/**
 * @tags: [read]
 * @tagReason: Lists existing comments on an issue or pull request. No provider-side mutations occur.
 * @pitfalls: This action works for pull request comments even when Issues are disabled on the repository.
 */
const action = createAction({
    description: 'List comments on an issue or pull request.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['issues:read', 'pull_requests:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const page = input.cursor ? parseInt(input.cursor, 10) : 1;
        if (isNaN(page) || page < 1) {
            throw new nango.ActionError({
                type: 'invalid_cursor',
                message: 'cursor must be a positive integer page number'
            });
        }

        const perPage = input.per_page ?? 30;

        const response = await nango.get({
            // https://docs.github.com/rest/issues/comments#list-issue-comments
            endpoint: `/repos/${encodeURIComponent(input.owner)}/${encodeURIComponent(input.repo)}/issues/${input.issue_or_pr_number}/comments`,
            params: {
                per_page: perPage,
                page: page
            },
            retries: 3
        });

        const comments = z.array(ProviderCommentSchema).parse(response.data);

        return {
            comments: comments.map((comment) => ({
                id: comment.id,
                body: comment.body,
                ...(comment.user != null && { user: { login: comment.user.login, id: comment.user.id } }),
                created_at: comment.created_at,
                updated_at: comment.updated_at,
                html_url: comment.html_url
            })),
            ...(comments.length === perPage && { next_page: String(page + 1) })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
