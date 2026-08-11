import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        owner: z.string().describe('The account owner of the repository. Example: "nango-provisioned-apps"'),
        repo: z.string().describe('The name of the repository. Example: "nango"'),
        deployment_id: z.number().int().describe('The ID of the deployment whose statuses to list. Example: 5850133226'),
        per_page: z.number().int().optional().describe('The number of results per page (max 100).'),
        cursor: z.string().optional().describe('Page number for offset-based pagination. Omit for the first page.')
    })
    .describe('Input for listing deployment statuses');

const ProviderDeploymentStatusSchema = z.object({
    id: z.number(),
    state: z.string(),
    description: z.string().nullable().optional(),
    environment: z.string().nullable().optional(),
    environment_url: z.string().nullable().optional(),
    created_at: z.string().nullable().optional(),
    updated_at: z.string().nullable().optional()
});

const DeploymentStatusSchema = z.object({
    id: z.number().describe('The unique identifier of the deployment status.'),
    state: z.string().describe('The state of the status, e.g., "success", "pending", "failure", or "error".'),
    description: z.string().optional().describe('A short description of the status.'),
    environment: z.string().optional().describe('The environment name for the deployment.'),
    environment_url: z.string().optional().describe('The URL to view the deployment in the environment.'),
    created_at: z.string().optional().describe('The ISO 8601 timestamp when the status was created.'),
    updated_at: z.string().optional().describe('The ISO 8601 timestamp when the status was last updated.')
});

const OutputSchema = z
    .object({
        items: z.array(DeploymentStatusSchema).describe('The list of deployment statuses.'),
        next_cursor: z.string().optional().describe('The cursor for the next page of results, if more pages are available.')
    })
    .describe('Output for listing deployment statuses');

/**
 * @tags: [read]
 * @tagReason: Lists the status history of a deployment via a GET request to the GitHub API.
 * @pitfalls: Statuses are returned in reverse chronological order with the newest first.
 */
const action = createAction({
    description: 'List the status history of a deployment.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const page = input.cursor ? Number(input.cursor) : 1;
        if (Number.isNaN(page) || page < 1) {
            throw new nango.ActionError({
                type: 'invalid_input',
                message: 'cursor must be a positive integer representing a page number'
            });
        }

        const response = await nango.get({
            // https://docs.github.com/rest/deployments/statuses#list-deployment-statuses
            endpoint: `/repos/${encodeURIComponent(input.owner)}/${encodeURIComponent(input.repo)}/deployments/${encodeURIComponent(String(input.deployment_id))}/statuses`,
            params: {
                ...(input.per_page !== undefined && { per_page: String(input.per_page) }),
                page: String(page)
            },
            retries: 3
        });

        const rawData = response.data;
        if (!Array.isArray(rawData)) {
            throw new nango.ActionError({
                type: 'unexpected_response',
                message: 'Expected an array of deployment statuses from the provider.'
            });
        }

        const items = rawData.map((item: unknown) => {
            const status = ProviderDeploymentStatusSchema.parse(item);
            return {
                id: status.id,
                state: status.state,
                ...(status.description != null && { description: status.description }),
                ...(status.environment != null && { environment: status.environment }),
                ...(status.environment_url != null && { environment_url: status.environment_url }),
                ...(status.created_at != null && { created_at: status.created_at }),
                ...(status.updated_at != null && { updated_at: status.updated_at })
            };
        });

        const perPage = input.per_page ?? 30;
        const next_cursor = items.length === perPage ? String(page + 1) : undefined;

        return {
            items,
            ...(next_cursor !== undefined && { next_cursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
