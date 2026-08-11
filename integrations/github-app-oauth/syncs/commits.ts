import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const MetadataSchema = z
    .object({
        owner: z.string().optional().describe('The GitHub account owner of the repository.'),
        repo: z.string().optional().describe('The name of the repository.'),
        branch: z.string().optional().describe("The branch name to sync commits from. Defaults to the repository's default branch.")
    })
    .describe('Metadata specifying which repository and branch to sync commits from.');

const CheckpointSchema = z
    .object({
        // ISO 8601 high-water mark used when a single repository is selected via metadata. Empty
        // when auto-discovering installation repositories instead (checkpoint fields must be
        // required flat strings, so the unused mode's field is set to '' rather than omitted).
        since: z.string(),
        // JSON-encoded Record<string, string> mapping "owner/repo" to its ISO 8601 high-water mark,
        // used when auto-discovering installation repositories. Empty when a single repository is
        // selected via metadata instead.
        repos: z.string()
    })
    .describe('Checkpoint storing the high-water mark(s) for incremental commit syncing.');

const CommitSchema = z
    .object({
        id: z.string().describe('A stable unique identifier for the commit, qualified by repository owner and name.'),
        sha: z.string().describe('The SHA hash of the commit.'),
        repository_owner: z.string().describe('The owner of the repository this commit belongs to.'),
        repository_name: z.string().describe('The name of the repository this commit belongs to.'),
        message: z.string().describe('The commit message.'),
        html_url: z.string().describe('The URL to view the commit on GitHub.'),
        author_name: z.string().optional().describe('The name of the commit author from the Git signature.'),
        author_email: z.string().optional().describe('The email of the commit author from the Git signature.'),
        author_date: z.string().optional().describe('The ISO 8601 timestamp when the commit was authored.'),
        author_login: z.string().optional().describe('The GitHub login of the commit author, if linked to a GitHub account.'),
        committer_name: z.string().optional().describe('The name of the commit committer from the Git signature.'),
        committer_email: z.string().optional().describe('The email of the commit committer from the Git signature.'),
        committer_date: z.string().optional().describe('The ISO 8601 timestamp when the commit was committed.'),
        committer_login: z.string().optional().describe('The GitHub login of the commit committer, if linked to a GitHub account.'),
        comment_count: z.number().optional().describe('The number of comments on the commit.'),
        parent_shas: z.array(z.string().describe('The SHA of a parent commit.')).optional().describe('The SHAs of the parent commits.')
    })
    .describe('A git commit on a repository branch.');

const GitHubCommitSchema = z.object({
    sha: z.string(),
    html_url: z.string(),
    commit: z.object({
        message: z.string(),
        author: z
            .object({
                name: z.string().optional(),
                email: z.string().optional(),
                date: z.string().optional()
            })
            .nullable()
            .optional(),
        committer: z
            .object({
                name: z.string().optional(),
                email: z.string().optional(),
                date: z.string().optional()
            })
            .nullable()
            .optional(),
        comment_count: z.number(),
        tree: z.object({
            sha: z.string(),
            url: z.string()
        })
    }),
    author: z
        .object({
            login: z.string().optional()
        })
        .passthrough()
        .nullable()
        .optional(),
    committer: z
        .object({
            login: z.string().optional()
        })
        .passthrough()
        .nullable()
        .optional(),
    parents: z.array(
        z.object({
            sha: z.string(),
            url: z.string(),
            html_url: z.string().optional()
        })
    )
});

const GitHubRepositorySchema = z.object({
    full_name: z.string()
});

// GitHub's `since` filter on the commits endpoint is exclusive of commits with the exact same
// timestamp as the checkpoint, so a small overlap is subtracted before using it as a lower bound.
// Commits are keyed by SHA, so re-fetching the boundary commit is a harmless no-op upsert.
const toOverlappingCheckpoint = (timestamp: string): string => {
    return new Date(new Date(timestamp).getTime() - 1000).toISOString();
};

const mapCommit = (item: unknown, owner: string, repo: string): { commit: z.infer<typeof CommitSchema>; date: string | undefined } => {
    const commit = GitHubCommitSchema.parse(item);
    const commitDate = commit.commit.committer?.date ?? commit.commit.author?.date;

    return {
        commit: {
            id: `${owner}/${repo}/${commit.sha}`,
            sha: commit.sha,
            repository_owner: owner,
            repository_name: repo,
            message: commit.commit.message,
            html_url: commit.html_url,
            ...(commit.commit.author?.name != null && { author_name: commit.commit.author.name }),
            ...(commit.commit.author?.email != null && { author_email: commit.commit.author.email }),
            ...(commit.commit.author?.date != null && { author_date: commit.commit.author.date }),
            ...(commit.author?.login != null && { author_login: commit.author.login }),
            ...(commit.commit.committer?.name != null && { committer_name: commit.commit.committer.name }),
            ...(commit.commit.committer?.email != null && { committer_email: commit.commit.committer.email }),
            ...(commit.commit.committer?.date != null && { committer_date: commit.commit.committer.date }),
            ...(commit.committer?.login != null && { committer_login: commit.committer.login }),
            comment_count: commit.commit.comment_count,
            parent_shas: commit.parents.map((p) => p.sha)
        },
        date: commitDate
    };
};

const sync = createSync({
    description: "Sync commits on a repository's default branch (or a specified branch).",
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    metadata: MetadataSchema,
    checkpoint: CheckpointSchema,
    models: {
        Commit: CommitSchema
    },

    exec: async (nango) => {
        const rawCheckpoint = await nango.getCheckpoint();
        const checkpoint = rawCheckpoint ? CheckpointSchema.parse(rawCheckpoint) : null;

        const rawMetadata = await nango.getMetadata();
        const metadata = MetadataSchema.parse(rawMetadata ?? {});

        const branch = metadata.branch;

        const singleRepoScoped = Boolean(metadata.owner && metadata.repo);
        const isFirstRun = singleRepoScoped ? (checkpoint?.since || undefined) === undefined : (checkpoint?.repos || undefined) === undefined;

        // trackDeletesStart/End must appear before/after every batchSave call in this file (by
        // source position, not just at runtime), so this is called before `syncRepoCommits` is
        // even defined below.
        if (isFirstRun) {
            await nango.trackDeletesStart('Commit');
        }

        const syncRepoCommits = async (owner: string, repo: string, since: string | undefined): Promise<string | undefined> => {
            let maxSince = since;

            const proxyConfig: ProxyConfiguration = {
                // https://docs.github.com/en/rest/commits/commits#list-commits
                endpoint: `repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/commits`,
                params: {
                    ...(branch && { sha: branch }),
                    per_page: 100,
                    ...(since && { since })
                },
                paginate: {
                    type: 'link',
                    limit: 100,
                    limit_name_in_request: 'per_page',
                    link_rel_in_response_header: 'next'
                },
                retries: 3
            };

            for await (const page of nango.paginate(proxyConfig)) {
                const commits = page.map((item) => {
                    const { commit, date } = mapCommit(item, owner, repo);
                    if (date && (!maxSince || date > maxSince)) {
                        maxSince = date;
                    }
                    return commit;
                });

                if (commits.length > 0) {
                    await nango.batchSave(commits, 'Commit');
                }
            }

            return maxSince;
        };

        // Repositories are only enumerated (and the "no repositories" guard only applies) when no
        // explicit owner/repo was provided via metadata.
        const repos: Array<{ owner: string; name: string; fullName: string }> = [];
        if (!singleRepoScoped) {
            // https://docs.github.com/en/rest/reference/apps#list-repositories-accessible-to-the-app-installation
            for await (const page of nango.paginate({
                endpoint: '/installation/repositories',
                paginate: {
                    limit_name_in_request: 'per_page',
                    limit: 100,
                    response_path: 'repositories'
                },
                retries: 3
            })) {
                for (const raw of page) {
                    const repo = GitHubRepositorySchema.parse(raw);
                    const parts = repo.full_name.split('/');
                    const owner = parts[0];
                    const name = parts[1];
                    if (parts.length !== 2 || !owner || !name) {
                        throw new Error(`Invalid repository full_name: ${repo.full_name}`);
                    }
                    repos.push({ owner, name, fullName: repo.full_name });
                }
            }

            if (repos.length === 0) {
                if (isFirstRun) {
                    throw new Error('No repositories accessible to this installation. Please provide owner and repo in metadata.');
                }
                // An empty response on a later run may be transient; skip rather than reconcile
                // away every previously synced commit.
                await nango.log('No repositories accessible to this installation; skipping this run.', { level: 'warn' });
                return;
            }
        }

        if (singleRepoScoped && metadata.owner && metadata.repo) {
            const previousSince = checkpoint?.since || undefined;
            const maxSince = await syncRepoCommits(metadata.owner, metadata.repo, previousSince);

            if (maxSince) {
                await nango.saveCheckpoint({ since: toOverlappingCheckpoint(maxSince), repos: '' });
            }
        } else {
            const previousRepos = checkpoint?.repos || undefined;
            const repoCheckpoints: Record<string, string> = previousRepos ? z.record(z.string(), z.string()).parse(JSON.parse(previousRepos)) : {};

            for (const repo of repos) {
                const sinceParam = repoCheckpoints[repo.fullName];
                const maxSince = await syncRepoCommits(repo.owner, repo.name, sinceParam);

                if (maxSince) {
                    repoCheckpoints[repo.fullName] = toOverlappingCheckpoint(maxSince);
                }
            }

            await nango.saveCheckpoint({ since: '', repos: JSON.stringify(repoCheckpoints) });
        }

        if (isFirstRun) {
            await nango.trackDeletesEnd('Commit');
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
