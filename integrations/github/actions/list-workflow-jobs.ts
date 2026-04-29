import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    owner: z.string().describe('Repository owner. Example: "viictoo"'),
    repo: z.string().describe('Repository name. Example: "api-playground2"'),
    run_id: z.number().describe('The ID of the workflow run. Example: 12345678'),
    filter: z.enum(['latest', 'all']).optional().describe('Filter to specify which jobs to include. Can be "latest" or "all". Default: "latest"'),
    per_page: z.number().optional().describe('The number of results per page (max 100). Default: 30'),
    page: z.number().optional().describe('Page number of results to fetch. Default: 1')
});

const WorkflowJobStepSchema = z.object({
    name: z.string(),
    status: z.string(),
    conclusion: z.string().nullable().optional(),
    number: z.number(),
    started_at: z.string().nullable().optional(),
    completed_at: z.string().nullable().optional()
});

const WorkflowJobSchema = z.object({
    id: z.number(),
    run_id: z.number(),
    workflow_name: z.string().nullable().optional(),
    head_branch: z.string().nullable().optional(),
    run_url: z.string(),
    run_attempt: z.number().optional(),
    node_id: z.string(),
    head_sha: z.string(),
    url: z.string(),
    html_url: z.string(),
    status: z.string(),
    conclusion: z.string().nullable().optional(),
    started_at: z.string().nullable().optional(),
    completed_at: z.string().nullable().optional(),
    name: z.string(),
    steps: z.array(WorkflowJobStepSchema).optional(),
    check_run_url: z.string().nullable().optional(),
    labels: z.array(z.string()).optional(),
    runner_id: z.number().nullable().optional(),
    runner_name: z.string().nullable().optional(),
    runner_group_id: z.number().nullable().optional(),
    runner_group_name: z.string().nullable().optional()
});

const ProviderResponseSchema = z.object({
    total_count: z.number(),
    jobs: z.array(WorkflowJobSchema)
});

const OutputSchema = z.object({
    total_count: z.number(),
    jobs: z.array(WorkflowJobSchema)
});

const action = createAction({
    description: 'List jobs in a workflow run attempt',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/list-workflow-jobs',
        group: 'Workflow Jobs'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['repo'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://docs.github.com/en/rest/actions/workflow-jobs#list-jobs-for-a-workflow-run
        const response = await nango.get({
            endpoint: `/repos/${encodeURIComponent(input.owner)}/${encodeURIComponent(input.repo)}/actions/runs/${input.run_id}/jobs`,
            params: {
                ...(input.filter !== undefined && { filter: input.filter }),
                ...(input.per_page !== undefined && { per_page: String(input.per_page) }),
                ...(input.page !== undefined && { page: String(input.page) })
            },
            retries: 3
        });

        const providerData = ProviderResponseSchema.parse(response.data);

        return {
            total_count: providerData.total_count,
            jobs: providerData.jobs
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
