import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        owner: z.string().describe('The account owner of the repository. Example: "octocat"'),
        repo: z.string().describe('The name of the repository. Example: "hello-world"'),
        per_page: z.number().int().min(1).max(100).optional().describe('The number of results per page. Maximum is 100.'),
        cursor: z.string().optional().describe('Pagination cursor representing the page number. Omit for the first page.')
    })
    .describe('Input parameters for listing GitHub Actions workflows in a repository.');

const RawWorkflowSchema = z.object({
    id: z.number(),
    node_id: z.string(),
    name: z.string(),
    path: z.string(),
    state: z.string(),
    created_at: z.string(),
    updated_at: z.string(),
    url: z.string(),
    html_url: z.string(),
    badge_url: z.string().nullish()
});

const WorkflowSchema = z.object({
    id: z.number().describe('The workflow identifier.'),
    node_id: z.string().describe('The node ID of the workflow.'),
    name: z.string().describe('The name of the workflow.'),
    path: z.string().describe('The path to the workflow file in the repository.'),
    state: z.string().describe('The current state of the workflow. Example: "active".'),
    created_at: z.string().describe('When the workflow was created.'),
    updated_at: z.string().describe('When the workflow was last updated.'),
    url: z.string().describe('The API URL for the workflow.'),
    html_url: z.string().describe('The HTML URL for the workflow.'),
    badge_url: z.string().optional().describe('The badge URL for the workflow.')
});

const OutputSchema = z
    .object({
        total_count: z.number().describe('The total number of workflows in the repository.'),
        workflows: z.array(WorkflowSchema).describe('The list of workflows.'),
        next_cursor: z.string().optional().describe('The cursor for the next page of results, if more pages are available.')
    })
    .describe('The list of GitHub Actions workflows in a repository, including pagination metadata.');

/**
 * @tags: [read]
 * @tagReason: Retrieves workflow definitions from the GitHub API without modifying any data.
 * @pitfalls: On repositories where GitHub Actions has never been triggered, this may return an empty list even when workflow files already exist; pushing any workflow change causes GitHub to index and reveal all pre-existing workflows at once.
 */
const action = createAction({
    description: 'List GitHub Actions workflows defined in a repository.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['actions:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const page = input.cursor ? parseInt(input.cursor, 10) : 1;
        if (Number.isNaN(page) || page < 1) {
            throw new nango.ActionError({
                type: 'invalid_input',
                message: 'cursor must be a positive integer string representing a page number.'
            });
        }

        const perPage = input.per_page ?? 30;

        const response = await nango.get({
            // https://docs.github.com/en/rest/actions/workflows?apiVersion=2022-11-28#list-repository-workflows
            endpoint: `repos/${encodeURIComponent(input.owner)}/${encodeURIComponent(input.repo)}/actions/workflows`,
            params: {
                per_page: String(perPage),
                page: String(page)
            },
            retries: 3
        });

        const rawData = response.data;
        if (!rawData || typeof rawData !== 'object' || Array.isArray(rawData)) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Unexpected response format from GitHub API.'
            });
        }

        const providerResponse = z
            .object({
                total_count: z.number(),
                workflows: z.array(z.unknown())
            })
            .safeParse(rawData);

        if (!providerResponse.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Unexpected response format from GitHub API.',
                details: providerResponse.error.message
            });
        }

        const totalCount = providerResponse.data.total_count;
        const rawWorkflows = providerResponse.data.workflows;

        const workflows = rawWorkflows.map((item) => {
            const parsed = RawWorkflowSchema.safeParse(item);
            if (!parsed.success) {
                throw new nango.ActionError({
                    type: 'invalid_response',
                    message: 'Invalid workflow item in response.',
                    details: parsed.error.message
                });
            }
            return {
                id: parsed.data.id,
                node_id: parsed.data.node_id,
                name: parsed.data.name,
                path: parsed.data.path,
                state: parsed.data.state,
                created_at: parsed.data.created_at,
                updated_at: parsed.data.updated_at,
                url: parsed.data.url,
                html_url: parsed.data.html_url,
                ...(parsed.data.badge_url != null && { badge_url: parsed.data.badge_url })
            };
        });

        const hasMore = workflows.length === perPage && totalCount > page * perPage;
        const nextCursor = hasMore ? String(page + 1) : undefined;

        return {
            total_count: totalCount,
            workflows,
            ...(nextCursor !== undefined && { next_cursor: nextCursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
