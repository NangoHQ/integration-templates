import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const ProviderUserSchema = z.object({
    login: z.string(),
    id: z.number(),
    node_id: z.string(),
    avatar_url: z.string(),
    gravatar_id: z.string(),
    url: z.string(),
    html_url: z.string(),
    type: z.string(),
    site_admin: z.boolean()
});

const ProviderDeploymentSchema = z.object({
    url: z.string(),
    id: z.number(),
    node_id: z.string(),
    sha: z.string(),
    ref: z.string(),
    task: z.string(),
    payload: z.unknown(),
    original_environment: z.string(),
    environment: z.string(),
    description: z.string().nullable(),
    creator: ProviderUserSchema.optional(),
    created_at: z.string(),
    updated_at: z.string(),
    statuses_url: z.string(),
    repository_url: z.string(),
    transient_environment: z.boolean(),
    production_environment: z.boolean(),
    performed_via_github_app: z.unknown().optional()
});

const DeploymentSchema = z
    .object({
        id: z.string().describe('The unique identifier of the deployment.'),
        node_id: z.string().describe('The global node ID of the deployment.'),
        sha: z.string().describe('The SHA of the commit being deployed.'),
        ref: z.string().describe('The name of the ref being deployed, such as a branch or tag name.'),
        task: z.string().describe('The deployment task, such as "deploy".'),
        original_environment: z.string().describe('The original environment name of the deployment.'),
        environment: z.string().describe('The current environment name of the deployment.'),
        description: z.string().optional().describe('A short description of the deployment.'),
        creator_login: z.string().optional().describe('The login of the user who created the deployment.'),
        created_at: z.string().describe('The ISO 8601 timestamp when the deployment was created.'),
        updated_at: z.string().describe('The ISO 8601 timestamp when the deployment was last updated.'),
        statuses_url: z.string().describe('The API URL to list statuses for this deployment.'),
        repository_url: z.string().describe('The API URL of the repository.'),
        transient_environment: z.boolean().describe('Whether the deployment is set as transient.'),
        production_environment: z.boolean().describe('Whether the deployment is set as a production deployment.')
    })
    .describe('A GitHub deployment for a repository.');

const ProviderRepositorySchema = z.object({
    name: z.string(),
    owner: z
        .object({
            login: z.string()
        })
        .optional()
});

const sync = createSync({
    description: 'Sync deployments for a repository.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    models: {
        Deployment: DeploymentSchema
    },

    exec: async (nango) => {
        const repos = await getRepositories(nango);

        await nango.trackDeletesStart('Deployment');

        for (const repo of repos) {
            const owner = repo.owner?.login;
            const name = repo.name;

            if (typeof owner !== 'string' || typeof name !== 'string') {
                throw new Error('Repository missing required owner.login or name');
            }

            const proxyConfig: ProxyConfiguration = {
                // https://docs.github.com/en/rest/deployments/deployments?apiVersion=2022-11-28#list-deployments
                endpoint: `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(name)}/deployments`,
                paginate: {
                    type: 'link',
                    limit_name_in_request: 'per_page',
                    limit: 100
                },
                retries: 3
            };

            for await (const batch of nango.paginate(proxyConfig)) {
                if (!Array.isArray(batch)) {
                    throw new Error('Expected paginated batch to be an array');
                }

                const deployments = [];
                for (const item of batch) {
                    const parsed = ProviderDeploymentSchema.safeParse(item);
                    if (!parsed.success) {
                        throw new Error(`Failed to parse deployment: ${parsed.error.message}`);
                    }

                    const d = parsed.data;
                    deployments.push({
                        id: String(d.id),
                        node_id: d.node_id,
                        sha: d.sha,
                        ref: d.ref,
                        task: d.task,
                        original_environment: d.original_environment,
                        environment: d.environment,
                        ...(d.description != null && { description: d.description }),
                        ...(d.creator && { creator_login: d.creator.login }),
                        created_at: d.created_at,
                        updated_at: d.updated_at,
                        statuses_url: d.statuses_url,
                        repository_url: d.repository_url,
                        transient_environment: d.transient_environment,
                        production_environment: d.production_environment
                    });
                }

                if (deployments.length > 0) {
                    await nango.batchSave(deployments, 'Deployment');
                }
            }
        }

        await nango.trackDeletesEnd('Deployment');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;

async function getRepositories(nango: NangoSyncLocal) {
    const proxyConfig: ProxyConfiguration = {
        // https://docs.github.com/en/rest/apps/apps?apiVersion=2022-11-28#list-repositories-accessible-to-the-app-installation
        endpoint: '/installation/repositories',
        paginate: {
            type: 'link',
            limit_name_in_request: 'per_page',
            limit: 100,
            response_path: 'repositories'
        },
        retries: 3
    };

    const repos = [];
    for await (const batch of nango.paginate(proxyConfig)) {
        if (!Array.isArray(batch)) {
            throw new Error('Expected paginated batch to be an array');
        }

        for (const item of batch) {
            const parsed = ProviderRepositorySchema.safeParse(item);
            if (!parsed.success) {
                throw new Error(`Failed to parse repository: ${parsed.error.message}`);
            }
            repos.push(parsed.data);
        }
    }

    return repos;
}
