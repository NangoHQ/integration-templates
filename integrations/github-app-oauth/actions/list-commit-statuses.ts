import { z } from 'zod';
import { createAction, ProxyConfiguration } from 'nango';

const InputSchema = z
    .object({
        owner: z.string().describe('Repository owner username. Example: "octocat"'),
        repo: z.string().describe('Repository name. Example: "hello-world"'),
        sha: z.string().describe('Commit SHA, branch name, or tag name. Example: "abc123"'),
        cursor: z
            .string()
            .regex(/^[1-9]\d*$/, 'cursor must be a positive integer')
            .optional()
            .describe('Pagination cursor from the previous response. Omit for the first page.')
    })
    .describe('Input parameters to list commit statuses for a specific commit.');

const ProviderStatusSchema = z.object({
    id: z.number(),
    state: z.string(),
    context: z.string(),
    description: z.string().nullable().optional(),
    target_url: z.string().nullable().optional(),
    created_at: z.string(),
    updated_at: z.string()
});

const StatusSchema = z.object({
    id: z.string().describe('Unique identifier of the commit status.'),
    state: z.string().describe('State of the status. Can be "pending", "success", "failure", or "error".'),
    context: z.string().describe('A string label to differentiate this status from other systems. Example: "continuous-integration/jenkins".'),
    description: z.string().optional().describe('Short description of the status.'),
    target_url: z.string().optional().describe('Target URL to associate with this status.'),
    created_at: z.string().describe('ISO 8601 timestamp of when the status was created.'),
    updated_at: z.string().describe('ISO 8601 timestamp of when the status was updated.')
});

const OutputSchema = z
    .object({
        items: z.array(StatusSchema).describe('Array of commit statuses for the requested commit.'),
        next_cursor: z.string().optional().describe('Pagination cursor for the next page of results.')
    })
    .describe('List of commit statuses and pagination cursor for the requested commit.');

/**
 * @tags: [read]
 * @tagReason: Reads existing commit statuses from the GitHub API without making any provider-side mutations.
 * @pitfalls: GitHub Actions and other modern CI results use the Checks API and will not appear in this legacy commit statuses list.
 */
const action = createAction({
    description: 'List all statuses posted for a specific commit.',
    version: '1.0.3',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['statuses:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const page = input.cursor ? parseInt(input.cursor, 10) : 1;
        if (Number.isNaN(page)) {
            throw new nango.ActionError({
                type: 'invalid_input',
                message: 'cursor must be a valid page number'
            });
        }

        const perPage = 100;

        const config: ProxyConfiguration = {
            // https://docs.github.com/en/rest/commits/statuses#list-commit-statuses-for-a-reference
            endpoint: `/repos/${encodeURIComponent(input.owner)}/${encodeURIComponent(input.repo)}/commits/${encodeURIComponent(input.sha)}/statuses`,
            params: {
                per_page: String(perPage),
                ...(page > 1 && { page: String(page) })
            },
            retries: 3
        };

        const response = await nango.get(config);

        const rawStatuses = z.array(ProviderStatusSchema).safeParse(response.data);
        if (!rawStatuses.success) {
            throw new nango.ActionError({
                type: 'unexpected_response',
                message: 'Provider response did not match expected schema'
            });
        }

        const statuses = rawStatuses.data.map((status) => ({
            id: String(status.id),
            state: status.state,
            context: status.context,
            ...(status.description != null && { description: status.description }),
            ...(status.target_url != null && { target_url: status.target_url }),
            created_at: status.created_at,
            updated_at: status.updated_at
        }));

        const nextCursor = rawStatuses.data.length === perPage ? String(page + 1) : undefined;

        return {
            items: statuses,
            ...(nextCursor !== undefined && { next_cursor: nextCursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
