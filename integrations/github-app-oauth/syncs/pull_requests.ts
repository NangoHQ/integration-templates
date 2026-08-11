import { createSync } from 'nango';
import { z } from 'zod';

const PullRequestSchema = z
    .object({
        id: z.string().describe('The unique identifier of the pull request'),
        number: z.number().describe('The pull request number within the repository'),
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
    updated_after: z.string()
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
    id: z.number(),
    name: z.string(),
    full_name: z.string(),
    owner: z
        .object({
            login: z.string()
        })
        .optional()
});

const GitHubReposResponseSchema = z.object({
    repositories: z.array(GitHubRepoSchema)
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
        const isFullRefresh = checkpointRaw == null;
        const checkpoint = checkpointRaw != null ? CheckpointSchema.parse(checkpointRaw) : undefined;
        const updatedAfter = checkpoint?.updated_after;
        let maxUpdatedAt = updatedAfter;

        // https://docs.github.com/rest/reference/apps#list-repositories-accessible-to-the-app-installation
        const reposResponse = await nango.get({
            endpoint: '/installation/repositories',
            params: {
                per_page: 100
            },
            retries: 3
        });

        const reposData = GitHubReposResponseSchema.parse(reposResponse.data);
        const repos = reposData.repositories;

        if (repos.length === 0) {
            return;
        }

        if (isFullRefresh) {
            await nango.trackDeletesStart('PullRequest');
        }

        for (const repo of repos) {
            const parts = repo.full_name.split('/');
            if (parts.length < 2) {
                throw new Error(`Invalid repository full_name: ${repo.full_name}`);
            }
            const owner = parts[0] ?? '';
            const repoName = parts[1] ?? '';

            // https://docs.github.com/rest/pulls/pulls#list-pull-requests
            const proxyConfig = {
                endpoint: `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repoName)}/pulls`,
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
        }

        if (isFullRefresh) {
            await nango.trackDeletesEnd('PullRequest');
        }

        if (maxUpdatedAt !== undefined && maxUpdatedAt !== updatedAfter) {
            await nango.saveCheckpoint({
                updated_after: maxUpdatedAt
            });
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
