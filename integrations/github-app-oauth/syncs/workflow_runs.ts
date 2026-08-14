import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const GitHubRepositorySchema = z.object({
    full_name: z.string()
});

const GitHubWorkflowRunSchema = z.object({
    id: z.number(),
    name: z.string().nullish(),
    head_branch: z.string().nullish(),
    head_sha: z.string().nullish(),
    path: z.string().nullish(),
    run_number: z.number().optional(),
    event: z.string().nullish(),
    status: z.string().nullish(),
    conclusion: z.string().nullish(),
    workflow_id: z.number().optional(),
    url: z.string().nullish(),
    html_url: z.string().nullish(),
    logs_url: z.string().nullish(),
    check_suite_url: z.string().nullish(),
    artifacts_url: z.string().nullish(),
    cancel_url: z.string().nullish(),
    rerun_url: z.string().nullish(),
    workflow_url: z.string().nullish(),
    created_at: z.string(),
    updated_at: z.string().nullish(),
    run_started_at: z.string().nullish(),
    jobs_url: z.string().nullish(),
    display_title: z.string().nullish()
});

const WorkflowRunSchema = z
    .object({
        id: z.string().describe('The unique identifier of the workflow run.'),
        repository_owner: z.string().describe('The owner of the repository this workflow run belongs to.'),
        repository_name: z.string().describe('The name of the repository this workflow run belongs to.'),
        name: z.string().optional().describe('The name of the workflow run.'),
        head_branch: z.string().optional().describe('The branch that the workflow run was triggered from.'),
        head_sha: z.string().optional().describe('The SHA of the commit that triggered the workflow run.'),
        path: z.string().optional().describe('The path to the workflow file, including ref.'),
        run_number: z.number().int().optional().describe('The sequential run number for the workflow.'),
        event: z.string().optional().describe('The GitHub event that triggered the workflow run.'),
        status: z.string().optional().describe('The current status of the workflow run, such as queued, in_progress, or completed.'),
        conclusion: z.string().optional().describe('The final conclusion of the workflow run, such as success, failure, or cancelled.'),
        workflow_id: z.number().int().optional().describe('The unique identifier of the parent workflow.'),
        url: z.string().optional().describe('The REST API URL for the workflow run.'),
        html_url: z.string().optional().describe('The HTML URL to view the workflow run in the GitHub web interface.'),
        logs_url: z.string().optional().describe('The REST API URL for the workflow run logs.'),
        check_suite_url: z.string().optional().describe('The REST API URL for the associated check suite.'),
        artifacts_url: z.string().optional().describe('The REST API URL for artifacts produced by the workflow run.'),
        cancel_url: z.string().optional().describe('The REST API URL to cancel the workflow run.'),
        rerun_url: z.string().optional().describe('The REST API URL to rerun the workflow run.'),
        workflow_url: z.string().optional().describe('The REST API URL for the parent workflow definition.'),
        created_at: z.string().describe('The ISO 8601 timestamp when the workflow run was created.'),
        updated_at: z.string().optional().describe('The ISO 8601 timestamp when the workflow run was last updated.'),
        run_started_at: z.string().optional().describe('The ISO 8601 timestamp when the workflow run started executing.'),
        jobs_url: z.string().optional().describe('The REST API URL for jobs in this workflow run.'),
        display_title: z.string().optional().describe('The display title for the workflow run.')
    })
    .describe('A GitHub Actions workflow run for a repository.');

// Per-repository sync state. `pendingRunIds` holds runs that were not yet `completed` the last
// time they were observed; they're individually re-checked every run (regardless of how long ago
// they were created) until GitHub reports a terminal status, so a long-lived queued/in_progress
// run can't fall out of the sync window and stop being refreshed. `missingRuns` counts consecutive
// runs where the repository was absent from `/installation/repositories`, used to distinguish a
// genuine uninstall from a one-off enumeration miss (see MISSING_RUN_THRESHOLD below).
const RepoStateSchema = z.object({
    createdAfter: z.string().optional(),
    pendingRunIds: z.array(z.number()),
    missingRuns: z.number().int().min(0).optional()
});
type RepoState = z.infer<typeof RepoStateSchema>;

const CheckpointSchema = z.object({
    // JSON-encoded Record<string, RepoState> keyed by "owner/repo". Nested objects aren't
    // supported in checkpoints, so the per-repository state is serialized into this string field.
    repos: z.string(),
    // 'true' once the first run has fully completed its trackDeletesStart/trackDeletesEnd
    // lifecycle. Kept separate from `repos` (which is persisted incrementally, per repository,
    // mid-run for resiliency) so a first run that fails partway through — after some progress was
    // already checkpointed — is retried as a first run on the next execution, rather than looking
    // "already synced" and silently skipping the trackDeletesStart/trackDeletesEnd lifecycle.
    initialSyncComplete: z.string()
});

// A repository missing from a single enumeration of `/installation/repositories` could reflect a
// transient/partial miss (network hiccup, provider-side eventual consistency) rather than a
// genuine uninstall. It must be missing for this many consecutive runs before its workflow runs
// are deleted, so a one-off miss can't cause irrecoverable data loss.
const MISSING_RUN_THRESHOLD = 2;

// GitHub's `created` filter lower bound is exclusive, so a small overlap is subtracted before
// using a repository's high-water mark as the next run's lower bound.
const toOverlappingCheckpoint = (timestamp: string): string => {
    return new Date(new Date(timestamp).getTime() - 1000).toISOString();
};

const mapWorkflowRun = (run: unknown, owner: string, name: string): z.infer<typeof WorkflowRunSchema> => {
    const parsedRun = GitHubWorkflowRunSchema.safeParse(run);
    if (!parsedRun.success) {
        throw new Error(`Failed to parse workflow run: ${parsedRun.error.message}`);
    }

    const data = parsedRun.data;
    return {
        id: String(data.id),
        repository_owner: owner,
        repository_name: name,
        ...(data.name != null && { name: data.name }),
        ...(data.head_branch != null && { head_branch: data.head_branch }),
        ...(data.head_sha != null && { head_sha: data.head_sha }),
        ...(data.path != null && { path: data.path }),
        ...(data.run_number !== undefined && { run_number: data.run_number }),
        ...(data.event != null && { event: data.event }),
        ...(data.status != null && { status: data.status }),
        ...(data.conclusion != null && { conclusion: data.conclusion }),
        ...(data.workflow_id !== undefined && { workflow_id: data.workflow_id }),
        ...(data.url != null && { url: data.url }),
        ...(data.html_url != null && { html_url: data.html_url }),
        ...(data.logs_url != null && { logs_url: data.logs_url }),
        ...(data.check_suite_url != null && { check_suite_url: data.check_suite_url }),
        ...(data.artifacts_url != null && { artifacts_url: data.artifacts_url }),
        ...(data.cancel_url != null && { cancel_url: data.cancel_url }),
        ...(data.rerun_url != null && { rerun_url: data.rerun_url }),
        ...(data.workflow_url != null && { workflow_url: data.workflow_url }),
        created_at: data.created_at,
        ...(data.updated_at != null && { updated_at: data.updated_at }),
        ...(data.run_started_at != null && { run_started_at: data.run_started_at }),
        ...(data.jobs_url != null && { jobs_url: data.jobs_url }),
        ...(data.display_title != null && { display_title: data.display_title })
    };
};

const sync = createSync({
    description: 'Sync GitHub Actions workflow runs for a repository.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        WorkflowRun: WorkflowRunSchema
    },

    exec: async (nango) => {
        const rawCheckpoint = await nango.getCheckpoint();
        const checkpoint = rawCheckpoint != null ? CheckpointSchema.parse(rawCheckpoint) : undefined;
        const repoStates: Record<string, RepoState> = checkpoint?.repos ? z.record(z.string(), RepoStateSchema).parse(JSON.parse(checkpoint.repos)) : {};

        // Kept separate from `repos` (which is persisted incrementally, per repository, mid-run
        // for resiliency) so a first run that fails partway through — after some progress was
        // already checkpointed — is retried as a first run on the next execution, rather than
        // looking "already synced" and silently skipping the trackDeletesStart/trackDeletesEnd
        // lifecycle.
        const isFirstRun = checkpoint?.initialSyncComplete !== 'true';
        const initialSyncCompleteValue = isFirstRun ? '' : 'true';

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
            throw new Error('No repositories accessible to this installation.');
        }

        // trackDeletesStart/End must appear before/after every batchSave/batchDelete call in this
        // file (by source position, not just at runtime); placed after the empty-repositories
        // check above so a run with no accessible repositories never opens delete tracking.
        if (isFirstRun) {
            await nango.trackDeletesStart('WorkflowRun');
        }

        // Repositories that were synced before but are no longer accessible to the installation
        // (e.g. the app was uninstalled from them) need their previously synced runs removed, once
        // they've been missing for MISSING_RUN_THRESHOLD consecutive runs (see
        // MISSING_RUN_THRESHOLD above) — a repository missing from a single enumeration could
        // reflect a transient/partial miss rather than a genuine uninstall.
        const currentRepoNames = new Set(repos.map((repo) => repo.fullName));
        const removedRepoNames = Object.keys(repoStates).filter((fullName) => !currentRepoNames.has(fullName));

        if (removedRepoNames.length > 0) {
            const toDeleteRepoNames: string[] = [];

            for (const fullName of removedRepoNames) {
                const missingRuns = (repoStates[fullName]?.missingRuns ?? 0) + 1;
                if (missingRuns >= MISSING_RUN_THRESHOLD) {
                    toDeleteRepoNames.push(fullName);
                } else {
                    repoStates[fullName] = { ...repoStates[fullName], pendingRunIds: repoStates[fullName]?.pendingRunIds ?? [], missingRuns };
                }
            }

            if (toDeleteRepoNames.length > 0) {
                const toDeleteRepoNameSet = new Set(toDeleteRepoNames);
                const toDelete: Array<{ id: string }> = [];

                for await (const record of nango.listRecords<{ id: string; repository_owner: string; repository_name: string }>('WorkflowRun')) {
                    if (toDeleteRepoNameSet.has(`${record['repository_owner']}/${record['repository_name']}`)) {
                        toDelete.push({ id: String(record['id']) });
                    }
                }

                if (toDelete.length > 0) {
                    await nango.batchDelete(toDelete, 'WorkflowRun');
                }

                for (const fullName of toDeleteRepoNames) {
                    delete repoStates[fullName];
                }
            }

            await nango.saveCheckpoint({ repos: JSON.stringify(repoStates), initialSyncComplete: initialSyncCompleteValue });
        }

        for (const repo of repos) {
            const previousState = repoStates[repo.fullName];
            let maxCreatedAt = previousState?.createdAfter;
            const pendingRunIds = new Set(previousState?.pendingRunIds ?? []);

            // Re-check every run that wasn't `completed` the last time it was observed, regardless
            // of how far outside the creation-time window it now falls, so long-lived runs still
            // get their terminal status recorded.
            for (const runId of pendingRunIds) {
                const response = await nango.get({
                    // https://docs.github.com/rest/actions/workflow-runs#get-a-workflow-run
                    endpoint: `repos/${encodeURIComponent(repo.owner)}/${encodeURIComponent(repo.name)}/actions/runs/${runId}`,
                    retries: 3
                });

                if (response.status === 404) {
                    await nango.batchDelete([{ id: String(runId) }], 'WorkflowRun');
                    pendingRunIds.delete(runId);
                    continue;
                }

                const run = mapWorkflowRun(response.data, repo.owner, repo.name);
                await nango.batchSave([run], 'WorkflowRun');

                if (run.status === 'completed') {
                    pendingRunIds.delete(runId);
                }
            }

            const createdAfterWithOverlap = previousState?.createdAfter ? toOverlappingCheckpoint(previousState.createdAfter) : undefined;

            const proxyConfig: ProxyConfiguration = {
                // https://docs.github.com/rest/actions/workflow-runs#list-workflow-runs-for-a-repository
                endpoint: `repos/${encodeURIComponent(repo.owner)}/${encodeURIComponent(repo.name)}/actions/runs`,
                params: {
                    per_page: 100,
                    ...(createdAfterWithOverlap !== undefined && { created: `${createdAfterWithOverlap}..*` })
                },
                paginate: {
                    type: 'link',
                    limit_name_in_request: 'per_page',
                    link_rel_in_response_header: 'next',
                    response_path: 'workflow_runs',
                    limit: 100
                },
                retries: 3
            };

            for await (const page of nango.paginate(proxyConfig)) {
                if (!Array.isArray(page)) {
                    throw new Error('Paginated page is not an array.');
                }

                const mappedRuns = page.map((run: unknown) => mapWorkflowRun(run, repo.owner, repo.name));

                if (mappedRuns.length > 0) {
                    await nango.batchSave(mappedRuns, 'WorkflowRun');

                    for (const run of mappedRuns) {
                        if (maxCreatedAt === undefined || run.created_at > maxCreatedAt) {
                            maxCreatedAt = run.created_at;
                        }
                        if (run.status !== 'completed') {
                            pendingRunIds.add(Number(run.id));
                        }
                    }
                }
            }

            repoStates[repo.fullName] = {
                ...(maxCreatedAt !== undefined && { createdAfter: maxCreatedAt }),
                pendingRunIds: [...pendingRunIds]
            };

            // Persisted after each repository so a run that fails partway through doesn't lose
            // progress already made, and so the removed-repository cleanup above always has an
            // up-to-date repository inventory to compare against on the next run.
            await nango.saveCheckpoint({ repos: JSON.stringify(repoStates), initialSyncComplete: initialSyncCompleteValue });
        }

        if (isFirstRun) {
            await nango.trackDeletesEnd('WorkflowRun');

            // Only now that the entire first run (repository discovery, all per-repository
            // syncing, and trackDeletesEnd) has completed successfully is the run marked complete,
            // so that a failure at any earlier point causes the next execution to retry as a first
            // run instead of skipping the trackDeletesStart/trackDeletesEnd lifecycle.
            await nango.saveCheckpoint({ repos: JSON.stringify(repoStates), initialSyncComplete: 'true' });
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
