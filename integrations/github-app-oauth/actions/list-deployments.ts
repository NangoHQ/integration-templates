import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        owner: z.string().describe('Repository owner. Example: "nango-provisioned-apps".'),
        repo: z.string().describe('Repository name. Example: "nango".'),
        sha: z.string().optional().describe('SHA hash of the deployment to filter by.'),
        ref: z.string().optional().describe('Name of the ref (branch, tag, or SHA) to filter by.'),
        task: z.string().optional().describe('Deployment task to filter by. Default: "deploy".'),
        environment: z.string().optional().describe('Name of the environment to filter by.'),
        per_page: z.number().int().min(1).max(100).optional().describe('Number of results per page. Max: 100.'),
        page: z.number().optional().describe('Page number of the results to fetch.')
    })
    .describe('Input parameters for listing repository deployments.');

const CreatorSchema = z
    .object({
        login: z.string().describe('Username of the deployment creator.'),
        id: z.number().describe('Unique identifier of the creator user.'),
        node_id: z.string().describe('Global node ID of the creator user.'),
        avatar_url: z.string().describe('Avatar URL of the creator.'),
        html_url: z.string().describe('GitHub profile URL of the creator.')
    })
    .describe('The user who created the deployment.');

const DeploymentSchema = z.object({
    id: z.number().describe('Unique identifier of the deployment.'),
    url: z.string().describe('API URL of the deployment.'),
    node_id: z.string().describe('Global node ID of the deployment.'),
    sha: z.string().describe('SHA hash of the commit being deployed.'),
    ref: z.string().describe('The ref (branch, tag, or SHA) being deployed.'),
    task: z.string().describe('The deployment task, typically "deploy".'),
    payload: z.unknown().describe('Optional payload attached to the deployment.'),
    environment: z.string().describe('The target environment of the deployment.'),
    description: z.string().nullable().describe('Optional description of the deployment.'),
    creator: CreatorSchema.nullable().optional(),
    created_at: z.string().describe('ISO 8601 timestamp when the deployment was created.'),
    updated_at: z.string().describe('ISO 8601 timestamp when the deployment was last updated.'),
    statuses_url: z.string().describe('URL to fetch deployment statuses.'),
    repository_url: z.string().describe('URL of the repository.'),
    transient_environment: z.boolean().describe('Whether the environment is transient.'),
    production_environment: z.boolean().describe('Whether this is a production environment.'),
    original_environment: z.string().describe('The original environment name at creation time.')
});

const OutputSchema = z
    .object({
        deployments: z.array(DeploymentSchema).describe('Array of deployment objects for the repository.'),
        next_page: z.number().optional().describe('Page number for the next page of results, if more pages may exist.')
    })
    .describe('Response containing a list of repository deployments and pagination information.');

/**
 * @tags: [read]
 * @tagReason: This action reads deployment data from the GitHub API without making any mutations.
 * @pitfalls: Callers may need to request one empty page to confirm the end of results because GitHub does not include a total count or has-more flag.
 */
const action = createAction({
    description: 'List deployments for a repository',
    version: '1.0.4',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['deployments:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://docs.github.com/rest/deployments/deployments#list-deployments
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

        const rawDeployments = z.array(DeploymentSchema).parse(response.data);
        const deployments = rawDeployments.map(({ creator, ...rest }) => ({
            ...rest,
            ...(creator != null && { creator })
        }));
        const currentPage = input.page ?? 1;
        const effectivePerPage = Math.min(input.per_page ?? 30, 100);
        const nextPage = deployments.length === effectivePerPage ? currentPage + 1 : undefined;

        return {
            deployments,
            ...(nextPage !== undefined && { next_page: nextPage })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
