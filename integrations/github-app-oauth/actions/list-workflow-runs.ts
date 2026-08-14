import { z } from 'zod';
import { createAction, ProxyConfiguration } from 'nango';

const InputSchema = z
    .object({
        owner: z.string().describe('Repository owner. Example: "nango-provisioned-apps"'),
        repo: z.string().describe('Repository name. Example: "nango"'),
        workflow_id: z
            .union([z.string(), z.number()])
            .optional()
            .describe('Workflow ID or workflow file name to filter runs to a specific workflow. Omit to list runs for all workflows in the repository.'),
        status: z
            .string()
            .optional()
            .describe(
                'Filter by run status. Examples: "completed", "action_required", "cancelled", "failure", "neutral", "skipped", "stale", "success", "timed_out", "in_progress", "queued", "requested", "waiting".'
            ),
        branch: z.string().optional().describe('Filter by the branch the workflow run was triggered against. Example: "master".'),
        per_page: z.number().int().min(1).max(100).optional().describe('Number of results per page (max 100). Default: 30.'),
        page: z.number().int().positive().optional().describe('Page number of the results to fetch. Default: 1.')
    })
    .describe('Input for listing GitHub Actions workflow runs.');

const ProviderWorkflowRunSchema = z.object({
    id: z.number(),
    name: z.string().nullable().optional(),
    node_id: z.string().nullable().optional(),
    head_branch: z.string().nullable().optional(),
    head_sha: z.string().nullable().optional(),
    path: z.string().nullable().optional(),
    run_number: z.number().nullable().optional(),
    event: z.string().nullable().optional(),
    status: z.string().nullable().optional(),
    conclusion: z.string().nullable().optional(),
    workflow_id: z.number().nullable().optional(),
    url: z.string().nullable().optional(),
    html_url: z.string().nullable().optional(),
    created_at: z.string().nullable().optional(),
    updated_at: z.string().nullable().optional()
});

const ProviderResponseSchema = z.object({
    total_count: z.number(),
    workflow_runs: z.array(ProviderWorkflowRunSchema).optional().default([])
});

const WorkflowRunSchema = z.object({
    id: z.number().describe('Unique identifier of the workflow run.'),
    name: z.string().optional().describe('Name of the workflow run.'),
    node_id: z.string().optional().describe('Global node ID for the workflow run.'),
    head_branch: z.string().optional().describe('Branch the run was triggered against.'),
    head_sha: z.string().optional().describe('SHA of the commit the run is based on.'),
    path: z.string().optional().describe('Path to the workflow file.'),
    run_number: z.number().optional().describe('Run number for this workflow run.'),
    event: z.string().optional().describe('Event that triggered the workflow run.'),
    status: z.string().optional().describe('Current status of the workflow run.'),
    conclusion: z.string().optional().describe('Conclusion of the workflow run after it has completed.'),
    workflow_id: z.number().optional().describe('ID of the workflow this run belongs to.'),
    url: z.string().optional().describe('API URL for the workflow run.'),
    html_url: z.string().optional().describe('HTML URL to view the workflow run in the browser.'),
    created_at: z.string().optional().describe('ISO 8601 timestamp when the run was created.'),
    updated_at: z.string().optional().describe('ISO 8601 timestamp when the run was last updated.')
});

const OutputSchema = z
    .object({
        total_count: z.number().describe('Total number of workflow runs matching the query filters.'),
        workflow_runs: z.array(WorkflowRunSchema).describe('Array of workflow runs.'),
        per_page: z.number().describe('Number of results per page.'),
        page: z.number().describe('Current page number of the results.'),
        next_page: z.number().optional().describe('Next page number if additional results are available.')
    })
    .describe('Output for listing GitHub Actions workflow runs.');

/**
 * @tags: [read]
 * @tagReason: Retrieves workflow run metadata from the GitHub API.
 * @pitfalls: conclusion is only present when status is completed; active, queued, or pending runs omit the field entirely.
 */
const action = createAction({
    description: 'List runs for a specific workflow, or for the whole repository.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['actions:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const endpoint =
            input.workflow_id !== undefined
                ? `repos/${encodeURIComponent(input.owner)}/${encodeURIComponent(input.repo)}/actions/workflows/${encodeURIComponent(String(input.workflow_id))}/runs`
                : `repos/${encodeURIComponent(input.owner)}/${encodeURIComponent(input.repo)}/actions/runs`;

        const config: Omit<ProxyConfiguration, 'method'> = {
            // https://docs.github.com/en/rest/actions/workflow-runs?apiVersion=2022-11-28#list-workflow-runs-for-a-workflow
            // https://docs.github.com/en/rest/actions/workflow-runs?apiVersion=2022-11-28#list-workflow-runs-for-a-repository
            endpoint,
            params: {
                ...(input.status !== undefined && { status: input.status }),
                ...(input.branch !== undefined && { branch: input.branch }),
                ...(input.per_page !== undefined && { per_page: input.per_page }),
                ...(input.page !== undefined && { page: input.page })
            },
            retries: 3
        };

        const response = await nango.get(config);
        const providerResponse = ProviderResponseSchema.parse(response.data);

        const perPage = input.per_page ?? 30;
        const page = input.page ?? 1;
        const nextPage = page * perPage < providerResponse.total_count ? page + 1 : undefined;

        return {
            total_count: providerResponse.total_count,
            workflow_runs: providerResponse.workflow_runs.map((run) => ({
                id: run.id,
                ...(run.name != null && { name: run.name }),
                ...(run.node_id != null && { node_id: run.node_id }),
                ...(run.head_branch != null && { head_branch: run.head_branch }),
                ...(run.head_sha != null && { head_sha: run.head_sha }),
                ...(run.path != null && { path: run.path }),
                ...(run.run_number != null && { run_number: run.run_number }),
                ...(run.event != null && { event: run.event }),
                ...(run.status != null && { status: run.status }),
                ...(run.conclusion != null && { conclusion: run.conclusion }),
                ...(run.workflow_id != null && { workflow_id: run.workflow_id }),
                ...(run.url != null && { url: run.url }),
                ...(run.html_url != null && { html_url: run.html_url }),
                ...(run.created_at != null && { created_at: run.created_at }),
                ...(run.updated_at != null && { updated_at: run.updated_at })
            })),
            per_page: perPage,
            page,
            ...(nextPage !== undefined && { next_page: nextPage })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
