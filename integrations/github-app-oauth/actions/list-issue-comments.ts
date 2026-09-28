import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        owner: z.string().describe('Repository owner.'),
        repo: z.string().describe('Repository name.'),
        issue_or_pr_number: z.number().describe('The number of an issue or pull request.'),
        cursor: z.string().optional().describe('Page number for pagination. Omit for the first page.'),
        per_page: z.number().optional().describe('Number of results per page. Defaults to 30, maximum is 100.')
    })
    .describe('Input to list comments on an issue or pull request.');

const CommentUserSchema = z.object({
    login: z.string().describe('Username of the comment author.'),
    id: z.number().describe('User ID.'),
    node_id: z.string().describe('Global node ID of the user.'),
    avatar_url: z.string().describe('URL of the user avatar.'),
    html_url: z.string().describe('URL to the user profile.')
});

const CommentSchema = z.object({
    id: z.number().describe('Comment ID.'),
    node_id: z.string().describe('Global node ID of the comment.'),
    url: z.string().describe('API URL of the comment.'),
    html_url: z.string().describe('Web URL of the comment.'),
    body: z.string().describe('Comment body in markdown format.'),
    body_text: z.string().optional().describe('Plain-text body of the comment.'),
    body_html: z.string().optional().describe('HTML body of the comment.'),
    user: CommentUserSchema.optional().describe('Author of the comment.'),
    created_at: z.string().describe('ISO 8601 timestamp of when the comment was created.'),
    updated_at: z.string().describe('ISO 8601 timestamp of when the comment was last updated.'),
    issue_url: z.string().describe('API URL of the issue or pull request.'),
    author_association: z.string().describe('Author association to the repository.')
});

const OutputSchema = z
    .object({
        comments: z.array(CommentSchema).describe('Array of comments on the issue or pull request.'),
        next_cursor: z.string().optional().describe('Page number for the next page of results. Omit if there are no more pages.')
    })
    .describe('Output containing comments on an issue or pull request and an optional next page cursor.');

/**
 * @tags: [read]
 * @tagReason: Reads comments from the GitHub API.
 * @pitfalls: Pull request comments are returned through the issue comments endpoint even when Issues is disabled, but review comments left on specific diff lines are excluded.
 */
const action = createAction({
    description: 'List comments on an issue or pull request.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['issues:read'],
    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const params: Record<string, string | number> = {
            per_page: input.per_page ?? 30
        };

        if (input.cursor !== undefined) {
            params['page'] = input.cursor;
        }

        const response = await nango.get({
            // https://docs.github.com/en/rest/issues/comments?apiVersion=2022-11-28#list-issue-comments
            endpoint: `repos/${encodeURIComponent(input.owner)}/${encodeURIComponent(input.repo)}/issues/${input.issue_or_pr_number}/comments`,
            params,
            retries: 3
        });

        const rawComments = z.array(z.unknown()).parse(response.data);

        const comments = rawComments.map((raw) => {
            const parsed = CommentSchema.parse(raw);
            return {
                id: parsed.id,
                node_id: parsed.node_id,
                url: parsed.url,
                html_url: parsed.html_url,
                body: parsed.body,
                ...(parsed.body_text !== undefined && { body_text: parsed.body_text }),
                ...(parsed.body_html !== undefined && { body_html: parsed.body_html }),
                ...(parsed.user !== undefined && { user: parsed.user }),
                created_at: parsed.created_at,
                updated_at: parsed.updated_at,
                issue_url: parsed.issue_url,
                author_association: parsed.author_association
            };
        });

        const nextPage = extractNextPage(typeof response.headers?.['link'] === 'string' ? response.headers['link'] : undefined);

        return {
            comments,
            ...(nextPage !== undefined && { next_cursor: nextPage })
        };
    }
});

function extractNextPage(linkHeader: string | undefined): string | undefined {
    if (linkHeader === undefined) {
        return undefined;
    }

    const links = linkHeader.split(',');
    for (const link of links) {
        const match = link.match(/<([^>]+)>[^;]*;\s*rel=["']?next["']?/i);
        if (match && match[1]) {
            const url = new URL(match[1]);
            const page = url.searchParams.get('page');
            if (page) {
                return page;
            }
        }
    }

    return undefined;
}

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
