import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const CommitSchema = z
    .object({
        id: z.string().describe('The SHA hash of the commit, used as a stable unique identifier.'),
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
    version: '1.0.2',
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
        const parsedCheckpoint = isFirstRun ? { since_by_repo: '{}', repo_full_name: '', page: 1 } : CheckpointSchema.parse(rawCheckpoint);
        const checkpoint = {
            since_by_repo: z.record(z.string(), z.string()).parse(JSON.parse(parsedCheckpoint.since_by_repo)),
            repo_full_name: parsedCheckpoint.repo_full_name,
            page: parsedCheckpoint.page
        };

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
            const sinceForRepo = sinceByRepo[repoFullName];
            let currentPage = repoFullName === resumeRepoFullName ? checkpoint.page : 1;
            let newestCommitDate: string | undefined = sinceForRepo;

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
                        id: c.sha,
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

                    const firstCommit = commits[0];
                    if (firstCommit?.committer_date && (newestCommitDate === undefined || firstCommit.committer_date > newestCommitDate)) {
                        newestCommitDate = firstCommit.committer_date;
                    }
                }

                currentPage = currentPage + 1;
                await nango.saveCheckpoint({
                    since_by_repo: JSON.stringify(sinceByRepo),
                    repo_full_name: repoFullName,
                    page: currentPage
                });
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
