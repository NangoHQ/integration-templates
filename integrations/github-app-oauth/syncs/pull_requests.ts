import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const MetadataSchema = z
    .object({
        repositories: z
            .array(
                z.object({
                    owner: z.string().describe('Repository owner login'),
                    repo: z.string().describe('Repository name')
                })
            )
            .describe('List of repositories to sync pull requests from')
    })
    .describe('Sync metadata specifying which repositories to fetch pull requests from');

const CheckpointSchema = z.object({
    updated_after_by_repo: z.string().describe('JSON-encoded map of "{owner}/{repo}" to the ISO 8601 updated_at watermark for that repository.')
});

// Legacy checkpoint shape used before this sync migrated to a per-repository checkpoint. Kept so
// connections that last ran the old version of this sync can migrate gracefully instead of crashing.
const LegacyCheckpointSchema = z.object({
    updated_after: z.string().describe('The single global ISO 8601 updated_at watermark used by the pre-migration version of this sync.')
});

// The old pre-migration version of this sync only ever synced this one hardcoded repository, so the
// legacy watermark only means anything for that specific repository, not for any other repo that may
// since have been added to the sync's metadata.
const LEGACY_SINGLE_REPO_FULL_NAME = 'nango-provisioned-apps/nango';

const AssigneeSchema = z
    .object({
        login: z.string().describe('The login username of the assignee.'),
        id: z.number().int().describe('The unique identifier of the assignee.')
    })
    .describe('A user assigned to the pull request.');

const ReviewerSchema = z
    .object({
        login: z.string().describe('The login username of the requested reviewer.'),
        id: z.number().int().describe('The unique identifier of the requested reviewer.')
    })
    .describe('A user requested to review the pull request.');

const LabelSchema = z
    .object({
        id: z.number().int().describe('The unique identifier of the label.'),
        name: z.string().describe('The name of the label.'),
        color: z.string().optional().describe('The hex color code for the label.')
    })
    .describe('A label attached to the pull request.');

const PullRequestSchema = z
    .object({
        id: z.string().describe('The unique string identifier of the pull request from GitHub.'),
        repository_owner: z.string().describe('The login of the repository owner this pull request belongs to.'),
        repository_name: z.string().describe('The name of the repository this pull request belongs to.'),
        number: z.number().int().describe('The pull request number within the repository.'),
        title: z.string().describe('The title of the pull request.'),
        state: z.string().describe('The current state of the pull request, such as open or closed.'),
        locked: z.boolean().describe('Whether the pull request is locked.'),
        user_login: z.string().optional().describe('The login username of the pull request author.'),
        user_id: z.number().int().optional().describe('The unique identifier of the pull request author.'),
        body: z.string().optional().describe('The body content of the pull request.'),
        created_at: z.string().describe('The ISO 8601 timestamp when the pull request was created.'),
        updated_at: z.string().describe('The ISO 8601 timestamp when the pull request was last updated.'),
        closed_at: z.string().optional().describe('The ISO 8601 timestamp when the pull request was closed, if applicable.'),
        merged_at: z.string().optional().describe('The ISO 8601 timestamp when the pull request was merged, if applicable.'),
        merge_commit_sha: z.string().optional().describe('The SHA of the merge commit if the pull request was merged.'),
        draft: z.boolean().optional().describe('Whether the pull request is a draft.'),
        html_url: z.string().describe('The URL to view the pull request in a browser.'),
        head_ref: z.string().optional().describe('The name of the branch containing the pull request changes.'),
        head_sha: z.string().optional().describe('The SHA of the head commit of the pull request branch.'),
        base_ref: z.string().optional().describe('The name of the branch the pull request targets.'),
        base_sha: z.string().optional().describe('The SHA of the latest commit on the target branch.'),
        assignees: z.array(AssigneeSchema).optional().describe('Users assigned to the pull request.'),
        requested_reviewers: z.array(ReviewerSchema).optional().describe('Users requested to review the pull request.'),
        labels: z.array(LabelSchema).optional().describe('Labels attached to the pull request.')
    })
    .describe('A GitHub pull request within a repository.');

const ProviderPullRequestSchema = z.object({
    id: z.number(),
    number: z.number(),
    title: z.string(),
    state: z.string(),
    locked: z.boolean(),
    user: z
        .object({
            login: z.string(),
            id: z.number(),
            avatar_url: z.string().optional(),
            html_url: z.string().optional()
        })
        .optional(),
    body: z.string().nullable().optional(),
    created_at: z.string(),
    updated_at: z.string(),
    closed_at: z.string().nullable().optional(),
    merged_at: z.string().nullable().optional(),
    merge_commit_sha: z.string().nullable().optional(),
    draft: z.boolean().optional(),
    html_url: z.string(),
    url: z.string(),
    head: z
        .object({
            ref: z.string(),
            sha: z.string(),
            repo: z
                .object({
                    id: z.number().optional(),
                    name: z.string().optional(),
                    full_name: z.string().optional()
                })
                .optional()
        })
        .optional(),
    base: z
        .object({
            ref: z.string(),
            sha: z.string(),
            repo: z
                .object({
                    id: z.number().optional(),
                    name: z.string().optional(),
                    full_name: z.string().optional()
                })
                .optional()
        })
        .optional(),
    assignees: z
        .array(
            z.object({
                login: z.string(),
                id: z.number(),
                avatar_url: z.string().optional(),
                html_url: z.string().optional()
            })
        )
        .optional(),
    requested_reviewers: z
        .array(
            z.object({
                login: z.string(),
                id: z.number(),
                avatar_url: z.string().optional(),
                html_url: z.string().optional()
            })
        )
        .optional(),
    labels: z
        .array(
            z.object({
                id: z.number(),
                name: z.string(),
                color: z.string().optional(),
                description: z.string().nullable().optional()
            })
        )
        .optional()
});

const sync = createSync({
    description: 'Sync pull requests for a repository.',
    version: '1.0.5',
    frequency: 'every 5 minutes',
    autoStart: false,
    metadata: MetadataSchema,
    checkpoint: CheckpointSchema,
    models: {
        PullRequest: PullRequestSchema
    },
    scopes: ['pull_requests:read'],
    exec: async (nango) => {
        const metadata = MetadataSchema.parse(await nango.getMetadata());
        if (metadata.repositories.length === 0) {
            throw new Error('No repositories found in metadata');
        }

        const rawCheckpoint = await nango.getCheckpoint();
        const isFirstRun = rawCheckpoint == null;

        let updatedAfterByRepo: Record<string, string> = {};
        let legacyUpdatedAfter: string | undefined;

        if (!isFirstRun) {
            const parsedCheckpoint = CheckpointSchema.safeParse(rawCheckpoint);
            if (parsedCheckpoint.success) {
                updatedAfterByRepo = z.record(z.string(), z.string()).parse(JSON.parse(parsedCheckpoint.data.updated_after_by_repo));
            } else {
                const parsedLegacyCheckpoint = LegacyCheckpointSchema.safeParse(rawCheckpoint);
                if (parsedLegacyCheckpoint.success) {
                    // Migrate from the old single global watermark: use it as the fallback for any repo
                    // that doesn't yet have its own per-repo entry, rather than re-fetching everything.
                    legacyUpdatedAfter = parsedLegacyCheckpoint.data.updated_after;
                } else {
                    throw new Error(`Failed to parse checkpoint: ${parsedCheckpoint.error.message}`);
                }
            }
        }

        if (isFirstRun) {
            await nango.trackDeletesStart('PullRequest');
        }

        for (const repo of metadata.repositories) {
            const repoFullName = `${repo.owner}/${repo.repo}`;
            const updatedAfter = updatedAfterByRepo[repoFullName] ?? (repoFullName === LEGACY_SINGLE_REPO_FULL_NAME ? legacyUpdatedAfter : undefined);

            // Seed the per-repo watermark up front so it survives even if this run finds zero new PRs for
            // this repo (which would otherwise leave the entry unset, forcing every future run to fully
            // backfill this repo instead of recognizing it as already caught up to `updatedAfter`).
            if (updatedAfter !== undefined) {
                updatedAfterByRepo[repoFullName] = updatedAfter;
            }

            const proxyConfig: ProxyConfiguration = {
                // https://docs.github.com/rest/pulls/pulls#list-pull-requests
                endpoint: `repos/${encodeURIComponent(repo.owner)}/${encodeURIComponent(repo.repo)}/pulls`,
                params: {
                    state: 'all',
                    sort: 'updated',
                    direction: 'desc',
                    per_page: '100'
                },
                paginate: {
                    type: 'link',
                    limit_name_in_request: 'per_page',
                    limit: 100,
                    link_rel_in_response_header: 'next'
                },
                retries: 3
            };

            let maxUpdatedAt: string | undefined;
            let stop = false;

            // https://docs.github.com/rest/pulls/pulls#list-pull-requests
            for await (const page of nango.paginate(proxyConfig)) {
                const validatedPage = page.map((item) => {
                    const result = ProviderPullRequestSchema.safeParse(item);
                    if (!result.success) {
                        throw new Error(`Failed to parse pull request: ${result.error.message}`);
                    }
                    return result.data;
                });

                if (validatedPage.length === 0) {
                    continue;
                }

                let prsToSave = validatedPage;

                if (updatedAfter) {
                    const firstStaleIndex = validatedPage.findIndex((pr) => pr.updated_at < updatedAfter);
                    if (firstStaleIndex === 0) {
                        break;
                    }
                    if (firstStaleIndex !== -1) {
                        prsToSave = validatedPage.slice(0, firstStaleIndex);
                        stop = true;
                    }
                }

                if (maxUpdatedAt === undefined) {
                    const firstPr = validatedPage[0];
                    if (firstPr) {
                        maxUpdatedAt = firstPr.updated_at;
                    }
                }

                const mapped = prsToSave.map((pr) => ({
                    id: String(pr.id),
                    repository_owner: repo.owner,
                    repository_name: repo.repo,
                    number: pr.number,
                    title: pr.title,
                    state: pr.state,
                    locked: pr.locked,
                    ...(pr.user && { user_login: pr.user.login, user_id: pr.user.id }),
                    ...(pr.body != null && { body: pr.body }),
                    created_at: pr.created_at,
                    updated_at: pr.updated_at,
                    ...(pr.closed_at != null && { closed_at: pr.closed_at }),
                    ...(pr.merged_at != null && { merged_at: pr.merged_at }),
                    ...(pr.merge_commit_sha != null && { merge_commit_sha: pr.merge_commit_sha }),
                    ...(pr.draft != null && { draft: pr.draft }),
                    html_url: pr.html_url,
                    ...(pr.head && { head_ref: pr.head.ref, head_sha: pr.head.sha }),
                    ...(pr.base && { base_ref: pr.base.ref, base_sha: pr.base.sha }),
                    ...(pr.assignees && {
                        assignees: pr.assignees.map((a) => ({ login: a.login, id: a.id }))
                    }),
                    ...(pr.requested_reviewers && {
                        requested_reviewers: pr.requested_reviewers.map((r) => ({ login: r.login, id: r.id }))
                    }),
                    ...(pr.labels && {
                        labels: pr.labels.map((l) => ({
                            id: l.id,
                            name: l.name,
                            ...(l.color && { color: l.color })
                        }))
                    })
                }));

                if (mapped.length > 0) {
                    await nango.batchSave(mapped, 'PullRequest');
                }

                if (stop) {
                    break;
                }
            }

            if (maxUpdatedAt !== undefined) {
                updatedAfterByRepo[repoFullName] = maxUpdatedAt;
            }

            // Only persist progress incrementally when this is NOT the initial delete-tracked scan: saving
            // a checkpoint mid-scan would make a crash-and-retry look like a plain incremental run next
            // time (isFirstRun is derived from checkpoint presence), skipping trackDeletesStart/End and
            // silently keeping pull requests that were actually deleted before the crash.
            if (!isFirstRun) {
                await nango.saveCheckpoint({ updated_after_by_repo: JSON.stringify(updatedAfterByRepo) });
            }
        }

        if (isFirstRun) {
            await nango.clearCheckpoint();
            await nango.trackDeletesEnd('PullRequest');
            await nango.saveCheckpoint({ updated_after_by_repo: JSON.stringify(updatedAfterByRepo) });
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
