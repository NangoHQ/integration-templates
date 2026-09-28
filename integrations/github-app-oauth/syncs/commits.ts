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
        since: z
            .string()
            .describe(
                'ISO 8601 timestamp of the most recently synced commit. Empty string on first run; used to filter commits incrementally on subsequent runs.'
            ),
        page: z.number().int().positive().describe('Pagination page number from the last execution. Reset to 1 during full-refresh delete-tracked runs.')
    })
    .describe('Checkpoint state for incremental commit syncing.');

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
    version: '1.0.1',
    frequency: 'every hour',
    autoStart: true,
    metadata: MetadataSchema,
    checkpoint: CheckpointSchema,
    models: {
        Commit: CommitSchema
    },
    scopes: ['contents:read'],
    exec: async (nango) => {
        const checkpointRaw = await nango.getCheckpoint();
        const checkpoint = checkpointRaw === undefined || checkpointRaw === null ? { since: '', page: 1 } : CheckpointSchema.parse(checkpointRaw);

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
            repos = [
                {
                    owner: metadata.owner,
                    repo: metadata.repo,
                    branch: metadata.branch ?? 'master'
                }
            ];
        } else {
            // https://docs.github.com/rest/reference/apps#list-repositories-accessible-to-the-app-installation
            const reposResponse = await nango.get({
                endpoint: '/installation/repositories',
                retries: 3
            });

            const parsedRepos = z
                .object({
                    repositories: z.array(ProviderRepoSchema)
                })
                .safeParse(reposResponse.data);

            if (!parsedRepos.success) {
                throw new Error(`Failed to parse installation repositories response: ${parsedRepos.error.message}`);
            }

            repos = parsedRepos.data.repositories.map((r) => {
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

        const targetRepo = repos[0];
        if (!targetRepo) {
            return;
        }

        const isFullRefresh = checkpoint.since === '';
        if (isFullRefresh) {
            await nango.trackDeletesStart('Commit');
        }

        let currentPage = checkpoint.page;
        let newestCommitDate: string | undefined = checkpoint.since === '' ? undefined : checkpoint.since;

        const targetOwner = targetRepo.owner;
        const targetRepoName = targetRepo.repo;
        const targetBranch = targetRepo.branch;
        const proxyConfig: ProxyConfiguration = {
            // https://docs.github.com/rest/commits/commits#list-commits
            endpoint: `/repos/${encodeURIComponent(targetOwner)}/${encodeURIComponent(targetRepoName)}/commits`,
            params: {
                sha: targetBranch,
                ...(checkpoint.since !== '' && { since: checkpoint.since }),
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
                since: checkpoint.since,
                page: currentPage
            });
        }

        if (isFullRefresh) {
            await nango.clearCheckpoint();
            await nango.trackDeletesEnd('Commit');
        }

        if (newestCommitDate !== undefined) {
            await nango.saveCheckpoint({ since: newestCommitDate, page: 1 });
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
