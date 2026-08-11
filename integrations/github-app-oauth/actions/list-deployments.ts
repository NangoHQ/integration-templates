import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        owner: z.string().describe('The account owner of the repository. Example: "octocat"'),
        repo: z.string().describe('The name of the repository. Example: "Hello-World"'),
        sha: z.string().optional().describe('The SHA recorded at creation time.'),
        ref: z.string().optional().describe('The name of the ref. This can be a branch, tag, or SHA.'),
        task: z.string().optional().describe('The name of the task for the deployment (e.g., deploy or deploy:migrations).'),
        environment: z.string().optional().describe('The name of the environment that was deployed to (e.g., staging or production).'),
        per_page: z.number().int().min(1).max(100).optional().describe('The number of results per page (max 100). Example: 30'),
        page: z.number().int().min(1).optional().describe('Page number of the results to fetch. Example: 1')
    })
    .describe('Input for listing deployments in a repository.');

const DeploymentSchema = z
    .object({
        url: z.string().describe('API URL for this deployment.'),
        id: z.number().describe('Unique deployment ID.'),
        node_id: z.string().describe('Global node ID for this deployment.'),
        sha: z.string().describe('SHA recorded at creation time.'),
        ref: z.string().describe('The ref (branch, tag, or SHA) being deployed.'),
        task: z.string().describe('The task for the deployment, e.g. "deploy".'),
        payload: z.union([z.record(z.string(), z.unknown()), z.string()]).describe('Extra payload for the deployment, either an object or a string.'),
        original_environment: z.string().optional().describe('Original environment name if it changed.'),
        environment: z.string().describe('Target environment name, e.g. "production".'),
        description: z.string().nullable().optional().describe('Description of the deployment.'),
        creator: z
            .object({
                login: z.string().describe('GitHub username of the creator.'),
                id: z.number().describe('GitHub user ID of the creator.'),
                node_id: z.string().describe('Global node ID of the creator.'),
                avatar_url: z.string().describe('Avatar URL of the creator.'),
                html_url: z.string().describe('GitHub profile URL of the creator.')
            })
            .optional()
            .describe('User who created the deployment.'),
        created_at: z.string().describe('ISO 8601 timestamp when the deployment was created.'),
        updated_at: z.string().describe('ISO 8601 timestamp when the deployment was last updated.'),
        statuses_url: z.string().describe('API URL for deployment statuses.'),
        repository_url: z.string().describe('API URL for the repository.'),
        transient_environment: z.boolean().optional().describe('Whether the environment is transient.'),
        production_environment: z.boolean().optional().describe('Whether the environment is a production environment.')
    })
    .describe('A deployment object.');

const OutputSchema = z
    .object({
        deployments: z.array(DeploymentSchema).describe('List of deployments for the repository.'),
        next_page: z.number().optional().describe('Next page number if more results are available.')
    })
    .describe('Output containing the list of deployments and pagination info.');

/**
 * @tags: [read]
 * @tagReason: Reads the list of deployments from the repository.
 * @pitfalls: Deployments are returned newest-first with no sort option, and status history is not included inline; callers must follow statuses_url to retrieve statuses separately.
 */
const action = createAction({
    description: 'List deployments for a repository.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['repo'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://docs.github.com/en/rest/deployments/deployments#list-deployments
        const response = await nango.get({
            endpoint: `/repos/${encodeURIComponent(input.owner)}/${encodeURIComponent(input.repo)}/deployments`,
            params: {
                ...(input.sha !== undefined && { sha: input.sha }),
                ...(input.ref !== undefined && { ref: input.ref }),
                ...(input.task !== undefined && { task: input.task }),
                ...(input.environment !== undefined && { environment: input.environment }),
                ...(input.per_page !== undefined && { per_page: String(input.per_page) }),
                ...(input.page !== undefined && { page: String(input.page) })
            },
            retries: 3
        });

        const deployments = z.array(DeploymentSchema).parse(response.data);

        const rawLink = response.headers?.['link'];
        const linkHeader = typeof rawLink === 'string' ? rawLink : undefined;
        const hasNextPage = linkHeader ? linkHeader.includes('rel="next"') : false;
        const currentPage = input.page ?? 1;
        const nextPage = hasNextPage ? currentPage + 1 : undefined;

        return {
            deployments,
            ...(nextPage !== undefined && { next_page: nextPage })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
