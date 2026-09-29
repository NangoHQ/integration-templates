import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const CommitSchema = z
    .object({
        id: z.string().describe('A stable unique identifier for this record, formatted as "{owner}/{repo}:{branch}:{sha}" to stay unique across repositories.'),
        sha: z.string().describe('The SHA hash of the commit.'),
        message: z.string().describe('The commit message.'),
        author_name: z.string().optional().describe('The name of the commit author from the Git identity.'),
        author_email: z.string().optional().describe('The email of the commit author from the Git identity.'),
        author_date: z.string().optional().describe('The ISO 8601 timestamp when the commit was authored.'),
        committer_name: z.string().optional().describe('The name of the commit committer from the Git identity.'),
        committer_email: z.string().optional().describe('The email of the commit committer from the Git identity.'),
        committer_date: z.string().optional().describe('The ISO 8601 timestamp when the commit was committed.'),
        author_login: z.string().optional().describe('The GitHub username of the commit author, if linked to a GitHub account.'),
        committer_login: z.string().optional().describe('The GitHub username of the commit committer, if linked to a GitHub account.'),
        html_url: z.string().optional().describe('The URL to view the commit on GitHub.'),
        parent_shas: z.array(z.string()).optional().describe('An array of parent commit SHAs.')
    })
    .describe('A Git commit on a repository branch.');

const CheckpointSchema = z
    .object({
        since_by_repo: z
            .string()
            .describe('JSON-encoded map of "{owner}/{repo}" to the ISO 8601 timestamp of the most recently synced commit for that repository.'),
        repo_full_name: z.string().describe('The "{owner}/{repo}" currently being paginated, used to resume a crashed mid-run.'),
        page: z.number().int().positive().describe('Pagination page for the repository currently being processed.')
    })
    .describe('Checkpoint state for incremental commit syncing across one or more repositories.');

// Legacy checkpoint shape used before this sync migrated to a per-repository checkpoint. Kept so
// connections that last ran the old version of this sync can migrate gracefully instead of crashing.
const LegacyCheckpointSchema = z.object({
    since: z.string().describe('The single global ISO 8601 watermark used by the pre-migration version of this sync.'),
    page: z.number().int().positive()
});

const MetadataSchema = z
    .object({
        owner: z.string().optional().describe('The repository owner. If omitted, the sync discovers accessible repositories from the GitHub App installation.'),
        repo: z.string().optional().describe('The repository name. If omitted, the sync discovers accessible repositories from the GitHub App installation.'),
        branch: z.string().optional().describe("The branch to sync commits from. Defaults to the repository's default branch if omitted.")
    })
    .describe('Optional metadata to target a specific repository and branch.');

const ProviderCommitSchema = z.object({
    sha: z.string(),
    commit: z.object({
        message: z.string(),
        author: z
            .object({
                name: z.string(),
                email: z.string(),
                date: z.string()
            })
            .optional(),
        committer: z
            .object({
                name: z.string(),
                email: z.string(),
                date: z.string()
            })
            .optional()
    }),
    author: z
        .object({
            login: z.string()
        })
        .nullable()
        .optional(),
    committer: z
        .object({
            login: z.string()
        })
        .nullable()
        .optional(),
    html_url: z.string(),
    parents: z
        .array(
            z.object({
                sha: z.string()
            })
        )
        .optional()
});

const ProviderRepoSchema = z.object({
    full_name: z.string(),
    default_branch: z.string()
});

const sync = createSync({
    description: "Sync commits on a repository's default branch (or a specified branch).",
    version: '1.0.5',
    frequency: 'every hour',
    autoStart: true,
    metadata: MetadataSchema,
    checkpoint: CheckpointSchema,
    models: {
        Commit: CommitSchema
    },
    scopes: ['contents:read'],
    exec: async (nango) => {
        const rawCheckpoint = await nango.getCheckpoint();
        const isFirstRun = rawCheckpoint === undefined || rawCheckpoint === null;

        let checkpoint: { since_by_repo: Record<string, string>; repo_full_name: string; page: number } = {
            since_by_repo: {},
            repo_full_name: '',
            page: 1
        };
        let legacySince: string | undefined;

        if (!isFirstRun) {
            const parsedCheckpoint = CheckpointSchema.safeParse(rawCheckpoint);
            if (parsedCheckpoint.success) {
                checkpoint = {
                    since_by_repo: z.record(z.string(), z.string()).parse(JSON.parse(parsedCheckpoint.data.since_by_repo)),
                    repo_full_name: parsedCheckpoint.data.repo_full_name,
                    page: parsedCheckpoint.data.page
                };
            } else {
                const parsedLegacyCheckpoint = LegacyCheckpointSchema.safeParse(rawCheckpoint);
                if (parsedLegacyCheckpoint.success) {
                    // Migrate from the old single-repo watermark: use it as the fallback for whichever repo
                    // doesn't yet have its own per-repo entry. The legacy `page` can't be attributed to any
                    // specific repo (the old schema was single-repo only), so it's dropped rather than resumed.
                    legacySince = parsedLegacyCheckpoint.data.since;
                } else {
                    throw new Error(`Failed to parse checkpoint: ${parsedCheckpoint.error.message}`);
                }
            }
        }

        let metadataRaw: unknown = {};
        try {
            metadataRaw = (await nango.getMetadata()) ?? {};
        } catch (error) {
            if (!(error instanceof Error) || !error.message.includes('Missing mock data for getMetadata')) {
                throw error;
            }
        }
        const parsedMetadata = MetadataSchema.safeParse(metadataRaw ?? {});
        if (!parsedMetadata.success) {
            throw new Error(`Failed to parse metadata: ${parsedMetadata.error.message}`);
        }
        const metadata = parsedMetadata.data;

        let repos: Array<{ owner: string; repo: string; branch: string }> = [];

        if (metadata.owner !== undefined && metadata.repo !== undefined) {
            let branch = metadata.branch;
            if (branch === undefined) {
                // https://docs.github.com/rest/repos/repos#get-a-repository
                const repoResponse = await nango.get({
                    endpoint: `/repos/${encodeURIComponent(metadata.owner)}/${encodeURIComponent(metadata.repo)}`,
                    retries: 3
                });
                branch = ProviderRepoSchema.parse(repoResponse.data).default_branch;
            }
            repos = [{ owner: metadata.owner, repo: metadata.repo, branch }];
        } else {
            const repositories: Array<z.infer<typeof ProviderRepoSchema>> = [];
            // https://docs.github.com/rest/reference/apps#list-repositories-accessible-to-the-app-installation
            for await (const repoBatch of nango.paginate({
                endpoint: '/installation/repositories',
                paginate: {
                    type: 'link',
                    limit_name_in_request: 'per_page',
                    limit: 100,
                    response_path: 'repositories',
                    link_rel_in_response_header: 'next'
                },
                retries: 3
            })) {
                repositories.push(...z.array(ProviderRepoSchema).parse(repoBatch));
            }

            repos = repositories.map((r) => {
                const parts = r.full_name.split('/');
                if (parts.length !== 2) {
                    throw new Error(`Unexpected repository full_name format: ${r.full_name}`);
                }
                const repoOwner = parts[0];
                const repoName = parts[1];
                if (repoOwner === undefined || repoName === undefined) {
                    throw new Error(`Unexpected repository full_name format: ${r.full_name}`);
                }
                return {
                    owner: repoOwner,
                    repo: repoName,
                    branch: metadata.branch ?? r.default_branch
                };
            });
        }

        if (repos.length === 0) {
            return;
        }

        if (isFirstRun) {
            await nango.trackDeletesStart('Commit');
        }

        const sinceByRepo: Record<string, string> = { ...checkpoint.since_by_repo };
        const resumeRepoFullName = checkpoint.repo_full_name;
        const resumeRepoIndex = resumeRepoFullName
            ? Math.max(
                  repos.findIndex((repo) => `${repo.owner}/${repo.repo}` === resumeRepoFullName),
                  0
              )
            : 0;

        for (let repoIndex = resumeRepoIndex; repoIndex < repos.length; repoIndex++) {
            const repo = repos[repoIndex];
            if (!repo) {
                continue;
            }
            const repoFullName = `${repo.owner}/${repo.repo}`;
            const sinceForRepo = sinceByRepo[repoFullName] ?? legacySince;
            let currentPage = repoFullName === resumeRepoFullName ? checkpoint.page : 1;
            let newestCommitDate: string | undefined = sinceForRepo;

            // Seed the map up front so a per-page checkpoint save mid-pagination (below) still reflects
            // this repo's watermark even before any newer commit is found — otherwise a crash before the
            // first page completes would drop the legacy `since` filter on resume and reprocess older history.
            if (sinceForRepo !== undefined) {
                sinceByRepo[repoFullName] = sinceForRepo;
            }

            const proxyConfig: ProxyConfiguration = {
                // https://docs.github.com/rest/commits/commits#list-commits
                endpoint: `/repos/${encodeURIComponent(repo.owner)}/${encodeURIComponent(repo.repo)}/commits`,
                params: {
                    sha: repo.branch,
                    ...(sinceForRepo !== undefined && { since: sinceForRepo }),
                    ...(currentPage > 1 && { page: String(currentPage) })
                },
                paginate: {
                    type: 'link',
                    limit: 100,
                    limit_name_in_request: 'per_page',
                    link_rel_in_response_header: 'next'
                },
                retries: 3
            };

            for await (const pageItems of nango.paginate(proxyConfig)) {
                const items = z.array(z.unknown()).safeParse(pageItems);
                if (!items.success) {
                    throw new Error(`Failed to parse paginated page items: ${items.error.message}`);
                }

                const commits = items.data.map((item) => {
                    const parsed = ProviderCommitSchema.safeParse(item);
                    if (!parsed.success) {
                        throw new Error(`Failed to parse commit: ${parsed.error.message}`);
                    }
                    const c = parsed.data;
                    return {
                        id: `${repoFullName}:${repo.branch}:${c.sha}`,
                        sha: c.sha,
                        message: c.commit.message,
                        ...(c.commit.author != null && {
                            author_name: c.commit.author.name,
                            author_email: c.commit.author.email,
                            author_date: c.commit.author.date
                        }),
                        ...(c.commit.committer != null && {
                            committer_name: c.commit.committer.name,
                            committer_email: c.commit.committer.email,
                            committer_date: c.commit.committer.date
                        }),
                        ...(c.author != null && { author_login: c.author.login }),
                        ...(c.committer != null && { committer_login: c.committer.login }),
                        ...(c.html_url != null && { html_url: c.html_url }),
                        ...(c.parents != null && {
                            parent_shas: c.parents.map((p) => p.sha)
                        })
                    };
                });

                if (commits.length > 0) {
                    await nango.batchSave(commits, 'Commit');

                    // Migration cleanup: connections that already synced under the pre-repo-scoped id
                    // (bare commit SHA) would otherwise keep that old record forever alongside the new
                    // one, since a normal incremental run doesn't do full delete-tracking. Deleting a
                    // record that was never saved under the old id is a no-op, so this is safe to run
                    // unconditionally on every save until every existing connection has migrated.
                    await nango.batchDelete(
                        commits.map((c) => ({ id: c.sha })),
                        'Commit'
                    );

                    const firstCommit = commits[0];
                    if (firstCommit?.committer_date && (newestCommitDate === undefined || firstCommit.committer_date > newestCommitDate)) {
                        newestCommitDate = firstCommit.committer_date;
                    }
                }

                currentPage = currentPage + 1;

                // Only persist progress incrementally when this is NOT the initial delete-tracked scan:
                // saving a checkpoint mid-scan would make a crash-and-retry look like a plain incremental
                // run next time (isFirstRun is derived from checkpoint presence), skipping
                // trackDeletesStart/End and silently keeping commits that were actually deleted before the
                // crash, while resuming from a stale page for whichever repo happened to be in progress.
                if (!isFirstRun) {
                    await nango.saveCheckpoint({
                        since_by_repo: JSON.stringify(sinceByRepo),
                        repo_full_name: repoFullName,
                        page: currentPage
                    });
                }
            }

            if (newestCommitDate !== undefined) {
                sinceByRepo[repoFullName] = newestCommitDate;
            }
        }

        if (isFirstRun) {
            await nango.clearCheckpoint();
            await nango.trackDeletesEnd('Commit');
        }

        await nango.saveCheckpoint({
            since_by_repo: JSON.stringify(sinceByRepo),
            repo_full_name: '',
            page: 1
        });
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
