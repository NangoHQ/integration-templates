import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        owner: z.string().describe('The account owner of the repository. The name is not case sensitive.'),
        repo: z.string().describe('The name of the repository without the .git extension.'),
        workflow_id: z
            .union([z.string(), z.number()])
            .optional()
            .describe('The ID or file name of a specific workflow. Omit to list runs for all workflows in the repository.'),
        status: z
            .enum([
                'completed',
                'action_required',
                'cancelled',
                'failure',
                'neutral',
                'skipped',
                'stale',
                'success',
                'timed_out',
                'in_progress',
                'queued',
                'requested',
                'waiting',
                'pending'
            ])
            .optional()
            .describe('Filter workflow runs by status or conclusion.'),
        branch: z.string().optional().describe('Filter to workflow runs associated with a branch.'),
        per_page: z.number().optional().describe('The number of results per page (max 100). Default: 30.'),
        page: z.number().optional().describe('The page number of the results to fetch.')
    })
    .describe('Parameters for listing workflow runs from a GitHub repository.');

const HeadCommitSchema = z.object({
    id: z.string().describe('The SHA of the head commit.'),
    tree_id: z.string().describe('The tree ID of the head commit.'),
    message: z.string().describe('The commit message.'),
    timestamp: z.string().describe('ISO 8601 timestamp of the commit.'),
    author: z
        .object({
            name: z.string().describe('The name of the commit author.'),
            email: z.string().describe('The email of the commit author.')
        })
        .nullable()
        .describe('The author of the head commit, if available.')
});

const WorkflowRunSchema = z.object({
    id: z.number().describe('The unique identifier of the workflow run.'),
    name: z.string().nullable().describe('The display name of the workflow run.'),
    node_id: z.string().describe('The global node ID for the workflow run.'),
    head_branch: z.string().nullable().describe('The branch the workflow run was triggered from.'),
    head_sha: z.string().describe('The SHA of the commit that triggered the workflow run.'),
    path: z.string().describe('The path to the workflow definition file.'),
    run_number: z.number().describe('The run number for the workflow.'),
    run_attempt: z.number().optional().describe('The attempt number for the workflow run.'),
    event: z.string().describe('The event that triggered the workflow run.'),
    status: z.string().nullable().describe('The current status of the workflow run.'),
    conclusion: z.string().nullable().describe('The final conclusion of the workflow run after it has completed.'),
    workflow_id: z.number().describe('The ID of the parent workflow.'),
    url: z.string().describe('API URL for the workflow run.'),
    html_url: z.string().describe('Browser URL for the workflow run.'),
    created_at: z.string().describe('ISO 8601 timestamp when the run was created.'),
    updated_at: z.string().describe('ISO 8601 timestamp when the run was last updated.'),
    run_started_at: z.string().optional().nullable().describe('ISO 8601 timestamp when the run started.'),
    jobs_url: z.string().describe('API URL to list jobs for this run.'),
    logs_url: z.string().describe('API URL to download logs for this run.'),
    check_suite_url: z.string().describe('API URL for the associated check suite.'),
    artifacts_url: z.string().describe('API URL to list artifacts for this run.'),
    cancel_url: z.string().describe('API URL to cancel this run.'),
    rerun_url: z.string().describe('API URL to rerun this run.'),
    workflow_url: z.string().describe('API URL for the parent workflow.'),
    head_commit: HeadCommitSchema.nullable().describe('The head commit for this run, if available.'),
    repository: z
        .object({
            id: z.number().describe('The unique identifier of the repository.'),
            name: z.string().describe('The short name of the repository.'),
            full_name: z.string().describe('The full name of the repository, including the owner.')
        })
        .passthrough()
        .describe('The repository this workflow run belongs to.'),
    display_title: z.string().describe('The title of the pull request or commit that triggered the run.')
});

const OutputSchema = z
    .object({
        total_count: z.number().describe('Total number of workflow runs matching the query.'),
        workflow_runs: z.array(WorkflowRunSchema).describe('The list of workflow runs.'),
        page: z.number().optional().describe('The page number returned in this response.')
    })
    .describe('The result of listing workflow runs from a GitHub repository.');

/**
 * @tags: [read]
 * @tagReason: Only reads workflow run data from the GitHub API.
 * @pitfalls: The `status` input parameter filters against both `status` and `conclusion` response fields, so querying `status: 'success'` returns runs with `status: 'completed'` and `conclusion: 'success'`.
 */
const action = createAction({
    description: 'List workflow runs for a specific workflow or for the whole repository.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['actions:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const baseEndpoint = `/repos/${encodeURIComponent(input.owner)}/${encodeURIComponent(input.repo)}/actions`;
        const endpoint = input.workflow_id ? `${baseEndpoint}/workflows/${encodeURIComponent(String(input.workflow_id))}/runs` : `${baseEndpoint}/runs`;

        const response = await nango.get({
            // https://docs.github.com/rest/actions/workflow-runs#list-workflow-runs-for-a-repository
            // https://docs.github.com/rest/actions/workflow-runs#list-workflow-runs-for-a-workflow
            endpoint,
            params: {
                ...(input.status !== undefined && { status: input.status }),
                ...(input.branch !== undefined && { branch: input.branch }),
                ...(input.per_page !== undefined && { per_page: String(input.per_page) }),
                ...(input.page !== undefined && { page: String(input.page) })
            },
            retries: 3
        });

        if (!response.data || typeof response.data !== 'object') {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Invalid or empty response from GitHub API'
            });
        }

        const totalCount = 'total_count' in response.data && typeof response.data.total_count === 'number' ? response.data.total_count : 0;
        const rawRuns = 'workflow_runs' in response.data && Array.isArray(response.data.workflow_runs) ? response.data.workflow_runs : [];

        const workflowRuns = rawRuns.map((run: unknown) => {
            const parsed = WorkflowRunSchema.safeParse(run);
            if (!parsed.success) {
                throw new nango.ActionError({
                    type: 'validation_error',
                    message: 'Failed to parse a workflow run from the provider response',
                    issues: parsed.error.issues
                });
            }
            return parsed.data;
        });

        return {
            total_count: totalCount,
            workflow_runs: workflowRuns,
            ...(input.page !== undefined && { page: input.page })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
