import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const WorkflowRunSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    head_branch: z.string().optional(),
    head_sha: z.string(),
    path: z.string(),
    run_number: z.number(),
    event: z.string(),
    status: z.string().optional(),
    conclusion: z.string().optional(),
    workflow_id: z.number(),
    url: z.string(),
    html_url: z.string(),
    created_at: z.string(),
    updated_at: z.string(),
    run_started_at: z.string().optional(),
    run_attempt: z.number().optional(),
    repository_id: z.number(),
    repository_name: z.string(),
    repository_owner: z.string()
});

// Checkpoint schema must use plain zod types without .optional()
const CheckpointSchema = z.object({
    updated_after: z.string()
});

const getLaterTimestamp = (current: string | undefined, candidate: string): string => {
    if (!current) {
        return candidate;
    }

    return new Date(candidate).getTime() > new Date(current).getTime() ? candidate : current;
};

const isNewerThanCheckpoint = (timestamp: string, checkpoint: string | undefined): boolean => {
    if (!checkpoint) {
        return true;
    }

    return new Date(timestamp).getTime() > new Date(checkpoint).getTime();
};

const toOverlappingCheckpoint = (timestamp: string): string => {
    return new Date(new Date(timestamp).getTime() - 1000).toISOString();
};

const MetadataSchema = z.object({
    repositories: z
        .array(
            z.object({
                owner: z.string(),
                name: z.string()
            })
        )
        .optional()
});

const InstallationRepositorySchema = z.object({
    name: z.string(),
    owner: z.object({
        login: z.string()
    })
});

const _GitHubWorkflowRunSchema = z.object({
    id: z.number(),
    name: z.string().nullable().optional(),
    head_branch: z.string().nullable(),
    head_sha: z.string(),
    path: z.string(),
    run_number: z.number(),
    event: z.string(),
    status: z.string().nullable(),
    conclusion: z.string().nullable(),
    workflow_id: z.number(),
    url: z.string(),
    html_url: z.string(),
    created_at: z.string(),
    updated_at: z.string(),
    run_started_at: z.string().optional().nullable(),
    run_attempt: z.number().optional(),
    repository: z
        .object({
            id: z.number(),
            name: z.string(),
            owner: z.object({
                login: z.string()
            })
        })
        .optional()
});

type GitHubWorkflowRun = z.infer<typeof _GitHubWorkflowRunSchema>;

type ScopedRepository = {
    owner: string;
    name: string;
};

type RepositoryScopeNango = {
    getConnection(): Promise<{ metadata: unknown }>;
    paginate<T>(config: unknown): AsyncIterable<T[]>;
};

const getRepositoriesInScope = async (nango: RepositoryScopeNango): Promise<ScopedRepository[]> => {
    const connection = await nango.getConnection();
    const metadataResult = MetadataSchema.safeParse(connection.metadata);
    const metadataRepositories = metadataResult.success ? (metadataResult.data.repositories ?? []) : [];

    if (metadataRepositories.length > 0) {
        return metadataRepositories;
    }

    const repositories: ScopedRepository[] = [];

    // https://docs.github.com/en/rest/apps/apps#list-repositories-accessible-to-the-app-installation
    for await (const page of nango.paginate<unknown>({
        endpoint: '/installation/repositories',
        paginate: {
            type: 'offset',
            offset_name_in_request: 'page',
            offset_start_value: 1,
            offset_calculation_method: 'per-page',
            limit_name_in_request: 'per_page',
            limit: 100,
            response_path: 'repositories'
        },
        retries: 3
    })) {
        for (const repository of page) {
            const parsed = InstallationRepositorySchema.safeParse(repository);
            if (!parsed.success) {
                continue;
            }

            repositories.push({
                owner: parsed.data.owner.login,
                name: parsed.data.name
            });
        }
    }

    return repositories;
};

const sync = createSync({
    description: 'Sync GitHub Actions workflow runs for one or more repositories.',
    version: '1.0.0',
    endpoints: [{ method: 'POST', path: '/syncs/workflow-runs' }],
    frequency: 'every hour',
    autoStart: true,
    metadata: MetadataSchema,
    checkpoint: CheckpointSchema,
    models: {
        WorkflowRun: WorkflowRunSchema
    },

    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint();
        const updatedAfter = checkpoint?.updated_after;
        let latestWorkflowRunUpdate: string | undefined;
        const repositories = await getRepositoriesInScope(nango);

        if (repositories.length === 0) {
            return;
        }

        for (const repo of repositories) {
            const proxyConfig: ProxyConfiguration = {
                // https://docs.github.com/en/rest/actions/workflow-runs?apiVersion=2022-11-28#list-workflow-runs-for-a-repository
                endpoint: `/repos/${encodeURIComponent(repo.owner)}/${encodeURIComponent(repo.name)}/actions/runs`,
                params: {
                    per_page: 100
                },
                paginate: {
                    type: 'offset',
                    offset_name_in_request: 'page',
                    offset_start_value: 1,
                    offset_calculation_method: 'per-page',
                    limit_name_in_request: 'per_page',
                    limit: 100,
                    response_path: 'workflow_runs',
                    on_page: async () => {}
                },
                retries: 3
            };

            for await (const page of nango.paginate<GitHubWorkflowRun>(proxyConfig)) {
                const workflowRuns: Array<z.infer<typeof WorkflowRunSchema>> = [];

                for (const run of page) {
                    if (!isNewerThanCheckpoint(run.updated_at, updatedAfter)) {
                        continue;
                    }

                    latestWorkflowRunUpdate = getLaterTimestamp(latestWorkflowRunUpdate, run.updated_at);

                    workflowRuns.push({
                        id: run.id.toString(),
                        ...(run.name !== null && run.name !== undefined && { name: run.name }),
                        ...(run.head_branch !== null && { head_branch: run.head_branch }),
                        head_sha: run.head_sha,
                        path: run.path,
                        run_number: run.run_number,
                        event: run.event,
                        ...(run.status !== null && { status: run.status }),
                        ...(run.conclusion !== null && { conclusion: run.conclusion }),
                        workflow_id: run.workflow_id,
                        url: run.url,
                        html_url: run.html_url,
                        created_at: run.created_at,
                        updated_at: run.updated_at,
                        ...(run.run_started_at !== null && run.run_started_at !== undefined && { run_started_at: run.run_started_at }),
                        ...(run.run_attempt !== undefined && { run_attempt: run.run_attempt }),
                        repository_id: run.repository?.id ?? 0,
                        repository_name: run.repository?.name ?? repo.name,
                        repository_owner: run.repository?.owner.login ?? repo.owner
                    });
                }

                if (workflowRuns.length > 0) {
                    await nango.batchSave(workflowRuns, 'WorkflowRun');
                }
            }
        }

        if (latestWorkflowRunUpdate) {
            await nango.saveCheckpoint({
                updated_after: toOverlappingCheckpoint(latestWorkflowRunUpdate)
            });
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
