import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        owner: z.string().describe('Repository owner (user or organization).'),
        repo: z.string().describe('Repository name.'),
        sha: z.string().optional().describe('Branch name, tag, or commit SHA to list commits from. Defaults to the repository default branch.'),
        path: z.string().optional().describe('Only commits containing this file path will be returned.'),
        since: z.string().optional().describe('Only commits after this ISO 8601 timestamp will be returned.'),
        until: z.string().optional().describe('Only commits before this ISO 8601 timestamp will be returned.'),
        per_page: z.number().min(1).max(100).optional().describe('Number of results per page (max 100). Defaults to 30.'),
        page: z.number().min(1).optional().describe('Page number of results. Defaults to 1.')
    })
    .describe('Input for listing commits in a repository.');

const CommitPersonSchema = z.object({
    name: z.string().describe('Display name.'),
    email: z.string().describe('Email address.'),
    date: z.string().describe('ISO 8601 timestamp.')
});

const CommitItemSchema = z.object({
    sha: z.string().describe('Commit SHA hash.'),
    message: z.string().describe('Commit message.'),
    author: CommitPersonSchema.optional().describe('Author metadata from the commit.'),
    committer: CommitPersonSchema.optional().describe('Committer metadata from the commit.'),
    html_url: z.string().describe('URL to view the commit on GitHub.')
});

const OutputSchema = z
    .object({
        items: z.array(CommitItemSchema).describe('Array of commit objects.'),
        next_page: z.number().optional().describe('Page number for the next page of results, if more results exist.')
    })
    .describe('Output containing a list of commits and optional pagination.');

/**
 * @tags: [read]
 * @tagReason: Retrieves commit history from the GitHub API without modifying repository state.
 * @pitfalls: File-create and -update commits have their committer rewritten to GitHub with a valid GPG signature, while delete commits retain the app's bot identity and are unsigned; callers inspecting committer metadata should expect inconsistency.
 */
const action = createAction({
    description: 'List commits on a branch or overall.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://docs.github.com/rest/commits/commits#list-commits
            endpoint: `/repos/${encodeURIComponent(input.owner)}/${encodeURIComponent(input.repo)}/commits`,
            params: {
                ...(input.sha !== undefined && { sha: input.sha }),
                ...(input.path !== undefined && { path: input.path }),
                ...(input.since !== undefined && { since: input.since }),
                ...(input.until !== undefined && { until: input.until }),
                ...(input.per_page !== undefined && { per_page: String(input.per_page) }),
                ...(input.page !== undefined && { page: String(input.page) })
            },
            retries: 3
        });

        const providerCommits = z.array(z.unknown()).parse(response.data);

        const items = providerCommits.map((raw) => {
            const commit = z
                .object({
                    sha: z.string(),
                    commit: z.object({
                        message: z.string(),
                        author: z
                            .object({
                                name: z.string(),
                                email: z.string(),
                                date: z.string()
                            })
                            .optional()
                            .nullable(),
                        committer: z
                            .object({
                                name: z.string(),
                                email: z.string(),
                                date: z.string()
                            })
                            .optional()
                            .nullable()
                    }),
                    html_url: z.string()
                })
                .parse(raw);

            return {
                sha: commit.sha,
                message: commit.commit.message,
                ...(commit.commit.author != null && {
                    author: {
                        name: commit.commit.author.name,
                        email: commit.commit.author.email,
                        date: commit.commit.author.date
                    }
                }),
                ...(commit.commit.committer != null && {
                    committer: {
                        name: commit.commit.committer.name,
                        email: commit.commit.committer.email,
                        date: commit.commit.committer.date
                    }
                }),
                html_url: commit.html_url
            };
        });

        const perPage = input.per_page ?? 30;
        const currentPage = input.page ?? 1;
        const nextPage = items.length === perPage ? currentPage + 1 : undefined;

        return {
            items,
            ...(nextPage !== undefined && { next_page: nextPage })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
