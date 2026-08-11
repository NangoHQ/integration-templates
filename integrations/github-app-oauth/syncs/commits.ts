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
        since: z.string().describe('ISO 8601 timestamp of the newest commit committer date processed in the last successful run.')
    })
    .describe('Checkpoint storing the high-water mark for incremental commit syncing.');

const CommitSchema = z
    .object({
        id: z.string().describe('The SHA hash of the commit, used as a stable unique identifier.'),
        sha: z.string().describe('The SHA hash of the commit.'),
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
        const isFirstRun = checkpoint === null;

        const rawMetadata = await nango.getMetadata();
        const metadata = MetadataSchema.parse(rawMetadata ?? {});

        const branch = metadata.branch;

        let owner: string;
        let repo: string;

        if (metadata.owner && metadata.repo) {
            owner = metadata.owner;
            repo = metadata.repo;
        } else {
            const reposConfig: ProxyConfiguration = {
                // https://docs.github.com/en/rest/reference/apps#list-repositories-accessible-to-the-app-installation
                endpoint: '/installation/repositories',
                params: {
                    per_page: 1
                },
                retries: 3
            };

            const reposResponse = await nango.get(reposConfig);

            const reposData = z
                .object({
                    repositories: z.array(z.object({ full_name: z.string() }).passthrough()).optional(),
                    total_count: z.number().optional()
                })
                .parse(reposResponse.data);

            const firstRepo = reposData.repositories?.[0];
            if (!firstRepo) {
                throw new Error('No repositories accessible to this installation. Please provide owner and repo in metadata.');
            }

            const parts = firstRepo.full_name.split('/');
            const ownerPart = parts[0];
            const repoPart = parts[1];
            if (!ownerPart || !repoPart) {
                throw new Error('Invalid repository full_name format from installation repositories.');
            }
            owner = ownerPart;
            repo = repoPart;
        }

        if (isFirstRun) {
            await nango.trackDeletesStart('Commit');
        }

        let maxSince: string | undefined;

        const proxyConfig: ProxyConfiguration = {
            // https://docs.github.com/en/rest/commits/commits#list-commits
            endpoint: `repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/commits`,
            params: {
                ...(branch && { sha: branch }),
                per_page: 100,
                ...(checkpoint?.since && { since: checkpoint.since })
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
                const commit = GitHubCommitSchema.parse(item);

                const commitDate = commit.commit.committer?.date ?? commit.commit.author?.date;
                if (commitDate && (!maxSince || commitDate > maxSince)) {
                    maxSince = commitDate;
                }

                return {
                    id: commit.sha,
                    sha: commit.sha,
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
                };
            });

            if (commits.length > 0) {
                await nango.batchSave(commits, 'Commit');
            }
        }

        if (isFirstRun) {
            await nango.trackDeletesEnd('Commit');
        }

        if (maxSince) {
            await nango.saveCheckpoint({ since: maxSince });
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
