import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        owner: z.string().describe('Repository owner. Example: "nango-provisioned-apps"'),
        repo: z.string().describe('Repository name. Example: "nango"'),
        sha: z.string().describe('Commit SHA, branch name, or tag name. Example: "a0c1289b8a1b2708d5e040b85a6ff0dedee4bd40"'),
        cursor: z.string().optional().describe('Pagination cursor (page number). Omit for the first page.')
    })
    .describe('Input parameters to list commit statuses for a specific reference.');

const GitHubStatusSchema = z.object({
    id: z.number(),
    state: z.string(),
    context: z.string(),
    description: z.string().nullable().optional(),
    target_url: z.string().nullable().optional(),
    created_at: z.string(),
    updated_at: z.string()
});

const StatusSchema = z.object({
    id: z.string().describe('Status ID.'),
    state: z.string().describe('Status state. Example: "success", "pending", "failure", "error".'),
    context: z.string().describe('Status context. Example: "nango/registry-test".'),
    description: z.string().optional().describe('Short description of the status.'),
    target_url: z.string().optional().describe('Target URL associated with the status.'),
    created_at: z.string().describe('ISO 8601 timestamp when the status was created.'),
    updated_at: z.string().describe('ISO 8601 timestamp when the status was updated.')
});

const OutputSchema = z
    .object({
        items: z.array(StatusSchema).describe('List of commit statuses.'),
        next_cursor: z.string().optional().describe('Cursor for the next page. Absent if this is the last page.')
    })
    .describe('Output containing the list of commit statuses and an optional pagination cursor.');

/**
 * @tags: [read]
 * @tagReason: Retrieves existing commit statuses from the provider.
 * @pitfalls: Statuses are returned in reverse chronological order, so the first item in the array is the latest one.
 */
const action = createAction({
    description: 'List all statuses posted for a specific commit.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['statuses:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const perPage = 100;
        const page = input.cursor ? parseInt(input.cursor, 10) : 1;
        if (isNaN(page) || page < 1) {
            throw new nango.ActionError({
                type: 'invalid_input',
                message: 'cursor must be a positive integer string.'
            });
        }

        const response = await nango.get({
            // https://docs.github.com/en/rest/commits/statuses#list-commit-statuses-for-a-reference
            endpoint: `/repos/${encodeURIComponent(input.owner)}/${encodeURIComponent(input.repo)}/commits/${encodeURIComponent(input.sha)}/statuses`,
            params: {
                per_page: perPage,
                page: page
            },
            retries: 3
        });

        const statuses = z.array(GitHubStatusSchema).parse(response.data);

        const items = statuses.map((status) => ({
            id: String(status.id),
            state: status.state,
            context: status.context,
            ...(status.description != null && { description: status.description }),
            ...(status.target_url != null && { target_url: status.target_url }),
            created_at: status.created_at,
            updated_at: status.updated_at
        }));

        return {
            items,
            ...(statuses.length === perPage && { next_cursor: String(page + 1) })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
