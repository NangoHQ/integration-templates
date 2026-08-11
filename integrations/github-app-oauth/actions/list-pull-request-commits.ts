import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        owner: z.string().describe('The account owner of the repository. Example: "nango-provisioned-apps"'),
        repo: z.string().describe('The name of the repository. Example: "nango"'),
        pull_number: z.number().int().positive().describe('The number of the pull request. Example: 1'),
        cursor: z.string().optional().describe('Pagination cursor (page number) from the previous response. Omit for the first page.')
    })
    .describe('Input to list the commits included in a pull request.');

const RawCommitPersonSchema = z.object({
    name: z.string().optional(),
    email: z.string().optional(),
    date: z.string().optional()
});

const RawCommitSchema = z.object({
    sha: z.string(),
    node_id: z.string().optional(),
    commit: z
        .object({
            message: z.string().optional(),
            author: RawCommitPersonSchema.nullable().optional(),
            committer: RawCommitPersonSchema.nullable().optional()
        })
        .optional(),
    html_url: z.string().optional(),
    url: z.string().optional(),
    comments_url: z.string().optional()
});

const CommitSchema = z.object({
    sha: z.string().describe('The SHA hash of the commit.'),
    node_id: z.string().optional().describe('The node ID of the commit.'),
    message: z.string().optional().describe('The commit message.'),
    author_name: z.string().optional().describe('The name of the commit author.'),
    author_email: z.string().optional().describe('The email of the commit author.'),
    author_date: z.string().optional().describe('The date the commit was authored.'),
    committer_name: z.string().optional().describe('The name of the commit committer.'),
    committer_email: z.string().optional().describe('The email of the commit committer.'),
    committer_date: z.string().optional().describe('The date the commit was committed.'),
    html_url: z.string().optional().describe('The URL to view the commit on GitHub.'),
    url: z.string().optional().describe('The API URL for the commit.'),
    comments_url: z.string().optional().describe('The API URL for the commit comments.')
});

const OutputSchema = z
    .object({
        items: z.array(CommitSchema).describe('The commits included in the pull request.'),
        next_cursor: z.string().optional().describe('The cursor for the next page of results. Omit if there are no more pages.')
    })
    .describe('Output containing the commits included in a pull request.');

/**
 * @tags: [read]
 * @tagReason: Lists commits from a pull request via a read-only GitHub API call.
 * @pitfalls: GitHub caps this endpoint at 250 commits per pull request; additional commits are silently omitted.
 */
const action = createAction({
    description: 'List the commits included in a pull request.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['pull_requests:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const perPage = 100;
        const page = input.cursor ? parseInt(input.cursor, 10) : 1;
        if (Number.isNaN(page) || page < 1) {
            throw new nango.ActionError({
                type: 'invalid_cursor',
                message: 'cursor must be a positive integer string representing a page number.'
            });
        }

        // https://docs.github.com/rest/pulls/pulls#list-commits-on-a-pull-request
        const response = await nango.get({
            endpoint: `/repos/${encodeURIComponent(input.owner)}/${encodeURIComponent(input.repo)}/pulls/${input.pull_number}/commits`,
            params: {
                per_page: '100',
                page: String(page)
            },
            retries: 3
        });

        const rawCommits = z.array(RawCommitSchema).parse(response.data);
        const items = rawCommits.map((commit) => ({
            sha: commit.sha,
            ...(commit.node_id !== undefined && { node_id: commit.node_id }),
            ...(commit.commit?.message !== undefined && { message: commit.commit.message }),
            ...(commit.commit?.author?.name !== undefined && { author_name: commit.commit.author.name }),
            ...(commit.commit?.author?.email !== undefined && { author_email: commit.commit.author.email }),
            ...(commit.commit?.author?.date !== undefined && { author_date: commit.commit.author.date }),
            ...(commit.commit?.committer?.name !== undefined && { committer_name: commit.commit.committer.name }),
            ...(commit.commit?.committer?.email !== undefined && { committer_email: commit.commit.committer.email }),
            ...(commit.commit?.committer?.date !== undefined && { committer_date: commit.commit.committer.date }),
            ...(commit.html_url !== undefined && { html_url: commit.html_url }),
            ...(commit.url !== undefined && { url: commit.url }),
            ...(commit.comments_url !== undefined && { comments_url: commit.comments_url })
        }));

        return {
            items,
            ...(rawCommits.length === perPage && { next_cursor: String(page + 1) })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
