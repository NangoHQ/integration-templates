import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        owner: z.string().describe('Repository owner username.'),
        repo: z.string().describe('Repository name.'),
        deployment_id: z.number().describe('Deployment ID.'),
        per_page: z.number().int().min(1).max(100).optional().describe('The number of results per page (max 100).'),
        cursor: z.string().optional().describe('Pagination cursor (page number) from the previous response. Omit for the first page.')
    })
    .describe('Input for listing deployment statuses.');

const StatusSchema = z.object({
    id: z.number().describe('Status ID.'),
    state: z.string().describe('Deployment state.'),
    description: z.string().optional().describe('Status description.'),
    environment: z.string().optional().describe('Environment name.'),
    environment_url: z.string().optional().describe('URL for the environment.'),
    target_url: z.string().optional().describe('Target URL.'),
    created_at: z.string().describe('Creation timestamp.'),
    updated_at: z.string().describe('Update timestamp.')
});

const OutputSchema = z
    .object({
        items: z.array(StatusSchema).describe('List of deployment statuses.'),
        next_cursor: z.string().optional().describe('Pagination cursor for the next page.')
    })
    .describe('Output containing a list of deployment statuses and optional pagination cursor.');

const ProviderStatusSchema = z.object({
    id: z.number(),
    node_id: z.string().optional(),
    state: z.string(),
    description: z.string().nullable().optional(),
    environment: z.string().nullable().optional(),
    environment_url: z.string().nullable().optional(),
    target_url: z.string().nullable().optional(),
    log_url: z.string().nullable().optional(),
    created_at: z.string(),
    updated_at: z.string(),
    creator: z.unknown().optional()
});

const ProviderResponseSchema = z.array(ProviderStatusSchema);

/**
 * @tags: [read]
 * @tagReason: Reads the deployment status history from the provider.
 * @pitfalls: Unset environment_url and target_url are returned as empty strings rather than being omitted from the output.
 */
const action = createAction({
    description: 'List the status history of a deployment.',
    version: '1.0.2',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['deployments:read'],
    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const page = input.cursor ? parseInt(input.cursor, 10) : 1;
        if (isNaN(page) || page < 1) {
            throw new nango.ActionError({
                type: 'invalid_cursor',
                message: 'cursor must be a positive integer string'
            });
        }

        const perPage = input.per_page ?? 100;

        const response = await nango.get({
            // https://docs.github.com/rest/deployments/statuses#list-deployment-statuses
            endpoint: `/repos/${encodeURIComponent(input.owner)}/${encodeURIComponent(input.repo)}/deployments/${encodeURIComponent(String(input.deployment_id))}/statuses`,
            params: {
                page: String(page),
                per_page: String(perPage)
            },
            retries: 3
        });

        const rawStatuses = ProviderResponseSchema.parse(response.data);

        const statuses = rawStatuses.map((status) => ({
            id: status.id,
            state: status.state,
            ...(status.description != null && { description: status.description }),
            ...(status.environment != null && { environment: status.environment }),
            ...(status.environment_url != null && { environment_url: status.environment_url }),
            ...(status.target_url != null && { target_url: status.target_url }),
            created_at: status.created_at,
            updated_at: status.updated_at
        }));

        const nextCursor = rawStatuses.length === perPage ? String(page + 1) : undefined;

        return {
            items: statuses,
            ...(nextCursor != null && { next_cursor: nextCursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
