import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const ProviderCreatorSchema = z.object({
    login: z.string(),
    id: z.number(),
    node_id: z.string(),
    avatar_url: z.string(),
    html_url: z.string()
});

const ProviderDeploymentSchema = z.object({
    id: z.number(),
    node_id: z.string(),
    sha: z.string(),
    ref: z.string(),
    task: z.string(),
    payload: z.unknown().optional(),
    original_environment: z.string(),
    environment: z.string(),
    description: z.string().nullable(),
    created_at: z.string(),
    updated_at: z.string(),
    statuses_url: z.string(),
    repository_url: z.string(),
    transient_environment: z.boolean(),
    production_environment: z.boolean().optional(),
    creator: ProviderCreatorSchema
});

const RepoSchema = z.object({
    full_name: z.string(),
    owner: z.object({
        login: z.string()
    }),
    name: z.string()
});

const InstallationReposSchema = z.object({
    total_count: z.number(),
    repositories: z.array(RepoSchema)
});

const CreatorSchema = z
    .object({
        login: z.string().describe('Username of the deployment creator'),
        id: z.number().describe('Unique identifier of the creator user'),
        node_id: z.string().describe('Global node identifier of the creator user'),
        avatar_url: z.string().describe('URL of the creators avatar image'),
        html_url: z.string().describe('URL of the creators GitHub profile')
    })
    .describe('The user who created the deployment');

const DeploymentSchema = z
    .object({
        id: z.string().describe('Unique identifier of the deployment'),
        node_id: z.string().describe('Global node identifier for the deployment'),
        sha: z.string().describe('SHA of the commit being deployed'),
        ref: z.string().describe('The ref to deploy, which can be a branch, tag, or SHA'),
        task: z.string().describe('The deployment task, such as deploy'),
        payload: z.unknown().optional().describe('JSON payload with extra information about the deployment'),
        original_environment: z.string().describe('The original environment specified when the deployment was created'),
        environment: z.string().describe('The current environment of the deployment'),
        description: z.string().optional().describe('A short description of the deployment'),
        created_at: z.string().describe('When the deployment was created'),
        updated_at: z.string().describe('When the deployment was last updated'),
        statuses_url: z.string().describe('URL to fetch deployment statuses'),
        repository_url: z.string().describe('URL of the repository'),
        transient_environment: z.boolean().describe('Whether the environment is transient and will be auto-deleted'),
        production_environment: z.boolean().optional().describe('Whether the environment is a production environment'),
        creator: CreatorSchema
    })
    .describe('A GitHub deployment for a repository');

const CheckpointSchema = z.object({
    repo_full_name: z.string(),
    page: z.number().int().positive()
});

const sync = createSync({
    description: 'Sync deployments for a repository.',
    version: '1.0.1',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        Deployment: DeploymentSchema
    },
    scopes: ['deployments:read'],
    exec: async (nango) => {
        const rawCheckpoint = await nango.getCheckpoint();
        const checkpoint = CheckpointSchema.parse({
            repo_full_name: '',
            page: 1,
            ...(rawCheckpoint && typeof rawCheckpoint === 'object' ? rawCheckpoint : {})
        });

        // https://docs.github.com/rest/apps/installations#list-repositories-accessible-to-the-app-installation
        const reposResponse = await nango.get({
            endpoint: '/installation/repositories',
            retries: 3
        });

        const parsedRepos = InstallationReposSchema.safeParse(reposResponse.data);
        if (!parsedRepos.success) {
            throw new Error(`Failed to parse installation repositories: ${parsedRepos.error.message}`);
        }

        const repositories = parsedRepos.data.repositories;

        // Blocker: provider only exposes /repos/{owner}/{repo}/deployments with no
        // changed-since filter, no deleted-record endpoint, and no resumable cursor.
        await nango.trackDeletesStart('Deployment');

        const checkpointRepoFullName = checkpoint.repo_full_name ?? repositories[0]?.full_name;
        const resumeRepoIndex = checkpointRepoFullName
            ? Math.max(
                  repositories.findIndex((repo) => repo.full_name === checkpointRepoFullName),
                  0
              )
            : 0;

        for (let repoIndex = resumeRepoIndex; repoIndex < repositories.length; repoIndex++) {
            const repo = repositories[repoIndex];
            if (!repo) {
                continue;
            }

            const owner = repo.owner.login;
            const repoName = repo.name;
            const repoFullName = repo.full_name;
            let currentPage = repoFullName === checkpointRepoFullName ? checkpoint.page : 1;

            const proxyConfig: ProxyConfiguration = {
                // https://docs.github.com/rest/deployments/deployments#list-deployments
                endpoint: `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repoName)}/deployments`,
                paginate: {
                    type: 'offset',
                    offset_name_in_request: 'page',
                    offset_start_value: currentPage,
                    offset_calculation_method: 'per-page',
                    limit_name_in_request: 'per_page',
                    limit: 100
                },
                retries: 3
            };

            for await (const deployments of nango.paginate(proxyConfig)) {
                const mappedDeployments = deployments.map((deployment) => {
                    const parsed = ProviderDeploymentSchema.safeParse(deployment);
                    if (!parsed.success) {
                        throw new Error(`Failed to parse deployment: ${parsed.error.message}`);
                    }

                    const data = parsed.data;

                    return {
                        id: String(data.id),
                        node_id: data.node_id,
                        sha: data.sha,
                        ref: data.ref,
                        task: data.task,
                        ...(data.payload !== undefined && { payload: data.payload }),
                        original_environment: data.original_environment,
                        environment: data.environment,
                        ...(data.description != null && { description: data.description }),
                        created_at: data.created_at,
                        updated_at: data.updated_at,
                        statuses_url: data.statuses_url,
                        repository_url: data.repository_url,
                        transient_environment: data.transient_environment,
                        ...(data.production_environment !== undefined && { production_environment: data.production_environment }),
                        creator: {
                            login: data.creator.login,
                            id: data.creator.id,
                            node_id: data.creator.node_id,
                            avatar_url: data.creator.avatar_url,
                            html_url: data.creator.html_url
                        }
                    };
                });

                if (mappedDeployments.length > 0) {
                    await nango.batchSave(mappedDeployments, 'Deployment');
                }

                currentPage += 1;
                await nango.saveCheckpoint({ repo_full_name: repoFullName, page: currentPage });
            }
        }

        await nango.clearCheckpoint();
        await nango.trackDeletesEnd('Deployment');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
