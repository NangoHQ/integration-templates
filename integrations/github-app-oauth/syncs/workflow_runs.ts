import { createSync } from 'nango';
import { z } from 'zod';

const CheckpointSchema = z.object({
    created_after_by_repo: z.string().describe('JSON-encoded map of "{owner}/{repo}" to the ISO 8601 created_at watermark for that repository.'),
    pending_run_ids_by_repo: z
        .string()
        .describe('JSON-encoded map of "{owner}/{repo}" to workflow run IDs whose status was not terminal as of the last sync.')
});

// Legacy checkpoint shape used before this sync migrated to a per-repository checkpoint. Kept so
// connections that last ran the old version of this sync can migrate gracefully instead of crashing.
const LegacyCheckpointSchema = z.object({
    created_after: z.string().describe('The single global ISO 8601 created_at watermark used by the pre-migration version of this sync.')
});

const WorkflowRunSchema = z
    .object({
        id: z.string().describe('The unique identifier of the workflow run.'),
        repository_owner: z.string().describe('The login of the repository owner this workflow run belongs to.'),
        repository_name: z.string().describe('The name of the repository this workflow run belongs to.'),
        name: z.string().optional().describe('The display name of the workflow run.'),
        head_branch: z.string().optional().describe('The branch that triggered the workflow run.'),
        head_sha: z.string().optional().describe('The SHA of the commit that triggered the workflow run.'),
        path: z.string().optional().describe('The path to the workflow file.'),
        run_number: z.number().describe('The run number of the workflow run.'),
        event: z.string().optional().describe('The event that triggered the workflow run.'),
        status: z.string().optional().describe('The current status of the workflow run.'),
        conclusion: z.string().optional().describe('The conclusion of the workflow run, if completed.'),
        workflow_id: z.number().describe('The ID of the workflow that generated this run.'),
        url: z.string().optional().describe('The API URL for the workflow run.'),
        html_url: z.string().optional().describe('The HTML URL for the workflow run.'),
        created_at: z.string().describe('The timestamp when the workflow run was created.'),
        updated_at: z.string().describe('The timestamp when the workflow run was last updated.')
    })
    .describe('A GitHub Actions workflow run for a repository.');

const ProviderWorkflowRunSchema = z.object({
    id: z.number(),
    name: z.string().nullish(),
    head_branch: z.string().nullish(),
    head_sha: z.string().nullish(),
    path: z.string().nullish(),
    run_number: z.number(),
    event: z.string().nullish(),
    status: z.string().nullish(),
    conclusion: z.string().nullable().optional(),
    workflow_id: z.number(),
    url: z.string().nullish(),
    html_url: z.string().nullish(),
    created_at: z.string(),
    updated_at: z.string()
});

const ProviderRepositorySchema = z.object({
    owner: z.object({
        login: z.string()
    }),
    name: z.string()
});

const sync = createSync({
    description: 'Sync GitHub Actions workflow runs for a repository.',
    version: '1.0.4',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        WorkflowRun: WorkflowRunSchema
    },
    scopes: ['actions:read'],
    exec: async (nango) => {
        const rawCheckpoint = await nango.getCheckpoint();
        const isFirstRun = rawCheckpoint == null;

        let createdAfterByRepo: Record<string, string> = {};
        let pendingRunIdsByRepo: Record<string, number[]> = {};
        let legacyCreatedAfter: string | undefined;

        if (!isFirstRun) {
            const parsedCheckpoint = CheckpointSchema.safeParse(rawCheckpoint);
            if (parsedCheckpoint.success) {
                createdAfterByRepo = z.record(z.string(), z.string()).parse(JSON.parse(parsedCheckpoint.data.created_after_by_repo));
                pendingRunIdsByRepo = z.record(z.string(), z.array(z.number())).parse(JSON.parse(parsedCheckpoint.data.pending_run_ids_by_repo));
            } else {
                // Intermediate checkpoint shape (per-repo watermark, added before pending-run tracking existed).
                const parsedIntermediateCheckpoint = z.object({ created_after_by_repo: z.string() }).safeParse(rawCheckpoint);
                if (parsedIntermediateCheckpoint.success) {
                    createdAfterByRepo = z.record(z.string(), z.string()).parse(JSON.parse(parsedIntermediateCheckpoint.data.created_after_by_repo));
                } else {
                    const parsedLegacyCheckpoint = LegacyCheckpointSchema.safeParse(rawCheckpoint);
                    if (parsedLegacyCheckpoint.success) {
                        // Migrate from the old single global watermark: use it as the fallback `since` for any
                        // repo that doesn't yet have its own per-repo entry, rather than re-fetching everything.
                        legacyCreatedAfter = parsedLegacyCheckpoint.data.created_after;
                    } else {
                        throw new Error(`Failed to parse checkpoint: ${parsedCheckpoint.error.message}`);
                    }
                }
            }
        }

        const repos: Array<{ owner: { login: string }; name: string }> = [];
        // https://docs.github.com/rest/reference/apps#list-repositories-accessible-to-the-app-installation
        for await (const page of nango.paginate<unknown>({
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
            for (const item of page) {
                const parsed = ProviderRepositorySchema.safeParse(item);
                if (!parsed.success) {
                    throw new Error(`Failed to parse repository: ${parsed.error.message}`);
                }
                repos.push(parsed.data);
            }
        }

        if (isFirstRun) {
            await nango.trackDeletesStart('WorkflowRun');
        }

        for (const repo of repos) {
            const owner = repo.owner.login;
            const name = repo.name;
            const repoFullName = `${owner}/${name}`;
            const createdAfter = createdAfterByRepo[repoFullName] ?? legacyCreatedAfter;
            let maxCreatedAt: string | undefined = createdAfter;
            const stillPendingRunIds: number[] = [];

            // Re-fetch runs left non-terminal by a previous sync, since the incremental `created` filter
            // below only ever discovers newly-created runs and would otherwise never see a queued/in_progress
            // run transition to its final status/conclusion.
            for (const runId of pendingRunIdsByRepo[repoFullName] ?? []) {
                // https://docs.github.com/rest/actions/workflow-runs#get-a-workflow-run
                const runResponse = await nango.get<unknown>({
                    endpoint: `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(name)}/actions/runs/${runId}`,
                    retries: 3
                });

                const parsedRun = ProviderWorkflowRunSchema.safeParse(runResponse.data);
                if (!parsedRun.success) {
                    throw new Error(`Failed to parse workflow run: ${parsedRun.error.message}`);
                }
                const run = parsedRun.data;

                await nango.batchSave(
                    [
                        {
                            id: String(run.id),
                            repository_owner: owner,
                            repository_name: name,
                            ...(run.name != null && { name: run.name }),
                            ...(run.head_branch != null && { head_branch: run.head_branch }),
                            ...(run.head_sha != null && { head_sha: run.head_sha }),
                            ...(run.path != null && { path: run.path }),
                            run_number: run.run_number,
                            ...(run.event != null && { event: run.event }),
                            ...(run.status != null && { status: run.status }),
                            ...(run.conclusion != null && { conclusion: run.conclusion }),
                            workflow_id: run.workflow_id,
                            ...(run.url != null && { url: run.url }),
                            ...(run.html_url != null && { html_url: run.html_url }),
                            created_at: run.created_at,
                            updated_at: run.updated_at
                        }
                    ],
                    'WorkflowRun'
                );

                if (run.status !== 'completed') {
                    stillPendingRunIds.push(run.id);
                }
            }

            // https://docs.github.com/rest/actions/workflow-runs#list-workflow-runs-for-a-repository
            for await (const page of nango.paginate<unknown>({
                endpoint: `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(name)}/actions/runs`,
                params: createdAfter ? { created: `>${createdAfter}` } : {},
                paginate: {
                    type: 'link',
                    limit_name_in_request: 'per_page',
                    limit: 100,
                    response_path: 'workflow_runs',
                    link_rel_in_response_header: 'next'
                },
                retries: 3
            })) {
                const runs = page.map((item) => {
                    const parsed = ProviderWorkflowRunSchema.safeParse(item);
                    if (!parsed.success) {
                        throw new Error(`Failed to parse workflow run: ${parsed.error.message}`);
                    }
                    return parsed.data;
                });

                if (runs.length === 0) {
                    continue;
                }

                const mapped = runs.map((run) => ({
                    id: String(run.id),
                    repository_owner: owner,
                    repository_name: name,
                    ...(run.name != null && { name: run.name }),
                    ...(run.head_branch != null && { head_branch: run.head_branch }),
                    ...(run.head_sha != null && { head_sha: run.head_sha }),
                    ...(run.path != null && { path: run.path }),
                    run_number: run.run_number,
                    ...(run.event != null && { event: run.event }),
                    ...(run.status != null && { status: run.status }),
                    ...(run.conclusion != null && { conclusion: run.conclusion }),
                    workflow_id: run.workflow_id,
                    ...(run.url != null && { url: run.url }),
                    ...(run.html_url != null && { html_url: run.html_url }),
                    created_at: run.created_at,
                    updated_at: run.updated_at
                }));

                await nango.batchSave(mapped, 'WorkflowRun');

                for (const run of runs) {
                    if (maxCreatedAt === undefined || run.created_at > maxCreatedAt) {
                        maxCreatedAt = run.created_at;
                    }
                    if (run.status !== 'completed') {
                        stillPendingRunIds.push(run.id);
                    }
                }
            }

            if (maxCreatedAt !== undefined) {
                createdAfterByRepo[repoFullName] = maxCreatedAt;
            }
            pendingRunIdsByRepo[repoFullName] = stillPendingRunIds;
            await nango.saveCheckpoint({
                created_after_by_repo: JSON.stringify(createdAfterByRepo),
                pending_run_ids_by_repo: JSON.stringify(pendingRunIdsByRepo)
            });
        }

        if (isFirstRun) {
            await nango.clearCheckpoint();
            await nango.trackDeletesEnd('WorkflowRun');
            await nango.saveCheckpoint({
                created_after_by_repo: JSON.stringify(createdAfterByRepo),
                pending_run_ids_by_repo: JSON.stringify(pendingRunIdsByRepo)
            });
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
