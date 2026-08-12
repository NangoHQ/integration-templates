import { createSync } from 'nango';
import { z } from 'zod';

const PullRequestSchema = z
    .object({
        id: z.string().describe('The unique identifier of the pull request'),
        number: z.number().describe('The pull request number within the repository'),
        repository_owner: z.string().describe('The owner of the repository this pull request belongs to'),
        repository_name: z.string().describe('The name of the repository this pull request belongs to'),
        title: z.string().describe('The title of the pull request'),
        state: z.string().describe('The state of the pull request (e.g., open, closed)'),
        created_at: z.string().describe('The ISO 8601 timestamp when the pull request was created'),
        updated_at: z.string().describe('The ISO 8601 timestamp when the pull request was last updated'),
        closed_at: z.string().optional().describe('The ISO 8601 timestamp when the pull request was closed, if applicable'),
        merged_at: z.string().optional().describe('The ISO 8601 timestamp when the pull request was merged, if applicable'),
        merge_commit_sha: z.string().optional().describe('The SHA of the merge commit, if the pull request was merged'),
        draft: z.boolean().describe('Whether the pull request is a draft'),
        user_login: z.string().optional().describe('The username of the user who created the pull request'),
        user_id: z.number().optional().describe('The unique numeric ID of the user who created the pull request'),
        head_ref: z.string().optional().describe('The name of the branch containing the pull request changes'),
        head_sha: z.string().optional().describe('The SHA of the head commit'),
        base_ref: z.string().optional().describe('The name of the branch the pull request targets'),
        base_sha: z.string().optional().describe('The SHA of the base commit'),
        html_url: z.string().optional().describe('The URL to view the pull request in a browser')
    })
    .describe('A GitHub pull request in a repository');

const CheckpointSchema = z.object({
    // JSON-encoded Record<string, string> mapping "owner/repo" to the ISO 8601 updated_at
    // high-water mark synced for that repository. Nested objects aren't supported in checkpoints,
    // so the per-repository map is serialized into this single string field.
    repos: z.string()
});

const GitHubUserSchema = z.object({
    login: z.string(),
    id: z.number(),
    type: z.string()
});

const GitHubPullSchema = z.object({
    id: z.number(),
    node_id: z.string(),
    number: z.number(),
    title: z.string(),
    state: z.string(),
    created_at: z.string(),
    updated_at: z.string(),
    closed_at: z.string().nullable().optional(),
    merged_at: z.string().nullable().optional(),
    merge_commit_sha: z.string().nullable().optional(),
    draft: z.boolean().optional(),
    user: GitHubUserSchema.nullable().optional(),
    head: z
        .object({
            ref: z.string(),
            sha: z.string()
        })
        .optional(),
    base: z
        .object({
            ref: z.string(),
            sha: z.string()
        })
        .optional(),
    html_url: z.string().optional()
});

const GitHubRepoSchema = z.object({
    full_name: z.string()
});

const sync = createSync({
    description: 'Sync pull requests for a repository',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        PullRequest: PullRequestSchema
    },

    exec: async (nango) => {
        const checkpointRaw = await nango.getCheckpoint();
        const checkpoint = checkpointRaw != null ? CheckpointSchema.parse(checkpointRaw) : undefined;
        const repoCheckpoints: Record<string, string> = checkpoint?.repos ? z.record(z.string(), z.string()).parse(JSON.parse(checkpoint.repos)) : {};

        // https://docs.github.com/rest/reference/apps#list-repositories-accessible-to-the-app-installation
        const repos: Array<{ owner: string; name: string; fullName: string }> = [];
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
                const repo = GitHubRepoSchema.parse(raw);
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
            // An empty response may be transient (e.g. a provider hiccup) rather than a real
            // "all repositories were removed" event. Skip the run rather than risk reconciling
            // away every previously synced pull request.
            await nango.log('No repositories accessible to this installation; skipping this run.', { level: 'warn' });
            return;
        }

        // Repositories that were synced before but are no longer accessible to the installation
        // (e.g. the app was uninstalled from them) need their previously synced pull requests removed.
        const currentRepoNames = new Set(repos.map((repo) => repo.fullName));
        const removedRepoNames = Object.keys(repoCheckpoints).filter((fullName) => !currentRepoNames.has(fullName));

        if (removedRepoNames.length > 0) {
            const removedRepoNameSet = new Set(removedRepoNames);
            const toDelete: Array<{ id: string }> = [];

            for await (const record of nango.listRecords<{ id: string; repository_owner: string; repository_name: string }>('PullRequest')) {
                if (removedRepoNameSet.has(`${record['repository_owner']}/${record['repository_name']}`)) {
                    toDelete.push({ id: String(record['id']) });
                }
            }

            if (toDelete.length > 0) {
                await nango.batchDelete(toDelete, 'PullRequest');
            }

            for (const fullName of removedRepoNames) {
                delete repoCheckpoints[fullName];
            }
        }

        for (const repo of repos) {
            const updatedAfter = repoCheckpoints[repo.fullName];
            let maxUpdatedAt = updatedAfter;

            // https://docs.github.com/rest/pulls/pulls#list-pull-requests
            const proxyConfig = {
                endpoint: `/repos/${encodeURIComponent(repo.owner)}/${encodeURIComponent(repo.name)}/pulls`,
                params: {
                    state: 'all',
                    sort: 'updated',
                    direction: 'desc'
                },
                paginate: {
                    link_rel_in_response_header: 'next',
                    limit_name_in_request: 'per_page',
                    limit: 100
                },
                retries: 3
            };

            for await (const page of nango.paginate(proxyConfig)) {
                const items = z.array(z.unknown()).parse(page);
                const prs: Array<z.infer<typeof PullRequestSchema>> = [];
                let shouldStop = false;

                for (const raw of items) {
                    const pr = GitHubPullSchema.parse(raw);

                    // Only stop early once we've established a high-water mark for this specific
                    // repository. A repository seen for the first time has no watermark yet, so it
                    // gets a full backfill instead of being cut short by another repository's checkpoint.
                    if (updatedAfter !== undefined && pr.updated_at < updatedAfter) {
                        shouldStop = true;
                        break;
                    }

                    if (maxUpdatedAt === undefined || pr.updated_at > maxUpdatedAt) {
                        maxUpdatedAt = pr.updated_at;
                    }

                    prs.push({
                        id: String(pr.id),
                        number: pr.number,
                        repository_owner: repo.owner,
                        repository_name: repo.name,
                        title: pr.title,
                        state: pr.state,
                        created_at: pr.created_at,
                        updated_at: pr.updated_at,
                        ...(pr.closed_at != null && { closed_at: pr.closed_at }),
                        ...(pr.merged_at != null && { merged_at: pr.merged_at }),
                        ...(pr.merge_commit_sha != null && { merge_commit_sha: pr.merge_commit_sha }),
                        draft: pr.draft ?? false,
                        ...(pr.user != null && { user_login: pr.user.login, user_id: pr.user.id }),
                        ...(pr.head != null && { head_ref: pr.head.ref, head_sha: pr.head.sha }),
                        ...(pr.base != null && { base_ref: pr.base.ref, base_sha: pr.base.sha }),
                        ...(pr.html_url != null && { html_url: pr.html_url })
                    });
                }

                if (prs.length > 0) {
                    await nango.batchSave(prs, 'PullRequest');
                }

                if (shouldStop) {
                    break;
                }
            }

            if (maxUpdatedAt !== undefined) {
                repoCheckpoints[repo.fullName] = maxUpdatedAt;
            }

            // Persisted after each repository (rather than once at the end) so a run that fails
            // partway through doesn't lose progress already made on earlier repositories, and so
            // the removed-repository cleanup above always has an up-to-date repository inventory
            // to compare against on the next run.
            await nango.saveCheckpoint({
                repos: JSON.stringify(repoCheckpoints)
            });
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
