import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        owner: z.string().describe('Repository owner username or organization name.'),
        repo: z.string().describe('Repository name.'),
        pull_number: z.number().describe('Pull request number.'),
        cursor: z.string().optional().describe('Pagination cursor (page number) from the previous response. Omit for the first page.')
    })
    .describe('Input for listing commits in a pull request.');

const CommitAuthorSchema = z.object({
    name: z.string().optional(),
    email: z.string().optional(),
    date: z.string().optional()
});

const CommitTreeSchema = z.object({
    sha: z.string(),
    url: z.string().optional()
});

const CommitVerificationSchema = z.object({
    verified: z.boolean().optional(),
    reason: z.string().optional(),
    signature: z.string().nullable().optional(),
    payload: z.string().nullable().optional(),
    verified_at: z.string().nullable().optional()
});

const ProviderCommitSchema = z.object({
    sha: z.string(),
    node_id: z.string().optional(),
    commit: z.object({
        author: CommitAuthorSchema.nullable().optional(),
        committer: CommitAuthorSchema.nullable().optional(),
        message: z.string(),
        tree: CommitTreeSchema.optional(),
        url: z.string().optional(),
        comment_count: z.number().optional(),
        verification: CommitVerificationSchema.optional()
    }),
    url: z.string().optional(),
    html_url: z.string().optional(),
    comments_url: z.string().optional(),
    parents: z
        .array(
            z.object({
                sha: z.string(),
                url: z.string().optional(),
                html_url: z.string().optional()
            })
        )
        .optional()
});

const CommitSchema = z.object({
    sha: z.string().describe('SHA of the commit.'),
    node_id: z.string().optional().describe('The node ID of the commit.'),
    message: z.string().describe('Commit message.'),
    author_name: z.string().optional().describe('Name of the commit author.'),
    author_email: z.string().optional().describe('Email of the commit author.'),
    author_date: z.string().optional().describe('Date the commit was authored.'),
    committer_name: z.string().optional().describe('Name of the commit committer.'),
    committer_email: z.string().optional().describe('Email of the commit committer.'),
    committer_date: z.string().optional().describe('Date the commit was committed.'),
    html_url: z.string().optional().describe('URL to view the commit on GitHub.'),
    url: z.string().optional().describe('The API URL for the commit.'),
    comments_url: z.string().optional().describe('The API URL for the commit comments.'),
    parents: z
        .array(
            z.object({
                sha: z.string().describe('SHA of the parent commit.'),
                html_url: z.string().optional().describe('URL to view the parent commit on GitHub.')
            })
        )
        .optional()
        .describe('Parent commits.')
});

const OutputSchema = z
    .object({
        items: z.array(CommitSchema).describe('Commits included in the pull request.'),
        next_cursor: z.string().optional().describe('Pagination cursor (page number) for the next page of results.')
    })
    .describe('Output containing the commits in a pull request and an optional next cursor.');

/**
 * @tags: [read]
 * @tagReason: Reads commits from an existing pull request.
 * @pitfalls: GitHub caps this at 250 commits total; larger pull requests require the general List commits endpoint.
 */
const action = createAction({
    description: 'List the commits included in a pull request.',
    version: '1.0.2',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['pull_requests:read'],
    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const page = input.cursor ? parseInt(input.cursor, 10) : 1;
        if (isNaN(page) || page < 1) {
            throw new nango.ActionError({
                type: 'invalid_input',
                message: 'cursor must be a positive integer page number.'
            });
        }

        // https://docs.github.com/en/rest/pulls/pulls?apiVersion=2022-11-28#list-commits-on-a-pull-request
        const response = await nango.get({
            endpoint: `/repos/${encodeURIComponent(input.owner)}/${encodeURIComponent(input.repo)}/pulls/${encodeURIComponent(String(input.pull_number))}/commits`,
            params: {
                per_page: 100,
                page: page
            },
            retries: 3
        });

        const commits = z.array(ProviderCommitSchema).parse(response.data);

        const items = commits.map((c) => ({
            sha: c.sha,
            ...(c.node_id != null && { node_id: c.node_id }),
            message: c.commit.message,
            ...(c.commit.author?.name != null && { author_name: c.commit.author.name }),
            ...(c.commit.author?.email != null && { author_email: c.commit.author.email }),
            ...(c.commit.author?.date != null && { author_date: c.commit.author.date }),
            ...(c.commit.committer?.name != null && { committer_name: c.commit.committer.name }),
            ...(c.commit.committer?.email != null && { committer_email: c.commit.committer.email }),
            ...(c.commit.committer?.date != null && { committer_date: c.commit.committer.date }),
            ...(c.html_url != null && { html_url: c.html_url }),
            ...(c.url != null && { url: c.url }),
            ...(c.comments_url != null && { comments_url: c.comments_url }),
            ...(c.parents != null && {
                parents: c.parents.map((p) => ({
                    sha: p.sha,
                    ...(p.html_url != null && { html_url: p.html_url })
                }))
            })
        }));

        const linkHeader = response.headers?.['link'];
        const hasNext = typeof linkHeader === 'string' && linkHeader.includes('rel="next"');
        const nextCursor = hasNext ? String(page + 1) : undefined;

        return {
            items,
            ...(nextCursor != null && { next_cursor: nextCursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
