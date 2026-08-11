import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        owner: z.string().describe('Repository owner. Example: "octo-org".'),
        repo: z.string().describe('Repository name. Example: "hello-world".'),
        per_page: z.number().int().min(1).max(100).optional().describe('Number of results per page (max 100). Default: 30.'),
        cursor: z.string().optional().describe('Pagination cursor (page number). Omit for the first page.')
    })
    .describe('Parameters for listing GitHub Actions workflows in a repository.');

const WorkflowSchema = z.object({
    id: z.number().describe('Unique identifier of the workflow.'),
    node_id: z.string().describe('Global node ID for the workflow.'),
    name: z.string().describe('Display name of the workflow.'),
    path: z.string().describe('Path to the workflow file in the repository.'),
    state: z.string().describe('Current state of the workflow (e.g., "active").'),
    created_at: z.string().describe('ISO 8601 timestamp when the workflow was created.'),
    updated_at: z.string().describe('ISO 8601 timestamp when the workflow was last updated.'),
    url: z.string().describe('API URL for the workflow.'),
    html_url: z.string().describe('HTML URL for the workflow file on GitHub.'),
    badge_url: z.string().describe('Badge image URL for the workflow.')
});

const ProviderResponseSchema = z.object({
    total_count: z.number(),
    workflows: z.array(WorkflowSchema)
});

const OutputSchema = z
    .object({
        total_count: z.number().describe('Total number of workflows in the repository.'),
        workflows: z.array(WorkflowSchema).describe('Array of workflow definitions.'),
        next_cursor: z.string().optional().describe('Pagination cursor for the next page. Omit if there are no more pages.')
    })
    .describe('Result of listing GitHub Actions workflows in a repository.');

/**
 * @tags: [read]
 * @tagReason: Lists existing GitHub Actions workflows in a repository.
 * @pitfalls: May return an empty list on repositories where Actions has never been triggered, even when workflow files already exist; an actual push event is required to activate and register them.
 */
const action = createAction({
    description: 'List GitHub Actions workflows defined in a repository.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['actions:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const page = input.cursor ? parseInt(input.cursor, 10) : 1;
        if (isNaN(page) || page < 1) {
            throw new nango.ActionError({
                type: 'invalid_cursor',
                message: 'cursor must be a positive integer string representing a page number.'
            });
        }

        const perPage = input.per_page ?? 30;

        const response = await nango.get({
            // https://docs.github.com/rest/actions/workflows#list-repository-workflows
            endpoint: `/repos/${encodeURIComponent(input.owner)}/${encodeURIComponent(input.repo)}/actions/workflows`,
            params: {
                per_page: perPage,
                page: page
            },
            retries: 3
        });

        const providerData = ProviderResponseSchema.parse(response.data);
        const hasNextPage = providerData.total_count > page * perPage;

        return {
            total_count: providerData.total_count,
            workflows: providerData.workflows,
            ...(hasNextPage && { next_cursor: String(page + 1) })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
