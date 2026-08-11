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

const CheckpointSchema = z.object({
    // JSON-encoded Record<string, string> mapping "owner/repo" to the ISO 8601 creation-time
    // high-water mark synced for that repository. Nested objects aren't supported in checkpoints,
    // so the per-repository map is serialized into this single string field.
    repos: z.string()
});

// Runs are re-fetched starting this far before each repository's high-water mark so that runs which
// were still queued/in_progress when created (and therefore have a stale status/conclusion) get
// re-observed and upserted once they complete, without re-fetching a repository's entire history.
const STATUS_REFRESH_OVERLAP_MS = 24 * 60 * 60 * 1000;

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
        const isFirstRun = rawCheckpoint == null;
        const checkpoint = rawCheckpoint != null ? CheckpointSchema.parse(rawCheckpoint) : undefined;
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

        if (isFirstRun) {
            await nango.trackDeletesStart('WorkflowRun');
        }

        for (const repo of repos) {
            const createdAfter = repoCheckpoints[repo.fullName];
            const createdAfterWithOverlap = createdAfter ? new Date(new Date(createdAfter).getTime() - STATUS_REFRESH_OVERLAP_MS).toISOString() : undefined;
            let maxCreatedAt = createdAfter;

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

                const mappedRuns = page.map((run: unknown) => {
                    const parsedRun = GitHubWorkflowRunSchema.safeParse(run);
                    if (!parsedRun.success) {
                        throw new Error(`Failed to parse workflow run: ${parsedRun.error.message}`);
                    }

                    const data = parsedRun.data;
                    return {
                        id: String(data.id),
                        repository_owner: repo.owner,
                        repository_name: repo.name,
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
                });

                if (mappedRuns.length > 0) {
                    await nango.batchSave(mappedRuns, 'WorkflowRun');

                    for (const run of mappedRuns) {
                        if (maxCreatedAt === undefined || run.created_at > maxCreatedAt) {
                            maxCreatedAt = run.created_at;
                        }
                    }
                }
            }

            if (maxCreatedAt !== undefined) {
                repoCheckpoints[repo.fullName] = maxCreatedAt;
            }
        }

        if (isFirstRun) {
            await nango.trackDeletesEnd('WorkflowRun');
        }

        await nango.saveCheckpoint({ repos: JSON.stringify(repoCheckpoints) });
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
