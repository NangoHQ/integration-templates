import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        owner: z.string().describe('The account owner of the repository. The name is not case sensitive.'),
        repo: z.string().describe('The name of the repository. The name is not case sensitive.'),
        run_id: z.number().describe('The unique identifier of the workflow run.'),
        cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.')
    })
    .describe('Input for listing the jobs that ran as part of a workflow run.');

const ProviderStepSchema = z.object({
    name: z.string(),
    status: z.string(),
    conclusion: z.string().nullable().optional(),
    number: z.number(),
    started_at: z.string().nullable().optional(),
    completed_at: z.string().nullable().optional()
});

const ProviderJobSchema = z.object({
    id: z.number(),
    run_id: z.number(),
    run_url: z.string(),
    node_id: z.string(),
    head_sha: z.string(),
    url: z.string(),
    html_url: z.string(),
    status: z.string(),
    conclusion: z.string().nullable().optional(),
    started_at: z.string().nullable().optional(),
    completed_at: z.string().nullable().optional(),
    name: z.string(),
    steps: z.array(ProviderStepSchema),
    check_run_url: z.string(),
    labels: z.array(z.string()),
    runner_id: z.number().nullable().optional(),
    runner_name: z.string().nullable().optional(),
    runner_group_id: z.number().nullable().optional(),
    runner_group_name: z.string().nullable().optional()
});

const ProviderResponseSchema = z.object({
    total_count: z.number(),
    jobs: z.array(ProviderJobSchema)
});

const StepSchema = z.object({
    name: z.string().describe('The name of the step.'),
    status: z.string().describe('The current status of the step.'),
    conclusion: z.string().optional().describe('The outcome of the step.'),
    number: z.number().describe('The order number of the step in the job.'),
    started_at: z.string().optional().describe('The date and time when the step started, in ISO 8601 format.'),
    completed_at: z.string().optional().describe('The date and time when the step completed, in ISO 8601 format.')
});

const JobSchema = z.object({
    id: z.number().describe('The unique identifier of the job.'),
    run_id: z.number().describe('The unique identifier of the workflow run that this job belongs to.'),
    run_url: z.string().describe('The REST API URL for the workflow run.'),
    node_id: z.string().describe('The node ID of the job.'),
    head_sha: z.string().describe('The SHA of the commit that is being run.'),
    url: z.string().describe('The REST API URL for the job.'),
    html_url: z.string().describe('The HTML URL for the job.'),
    status: z.string().describe('The current status of the job.'),
    conclusion: z.string().optional().describe('The outcome of the job.'),
    started_at: z.string().optional().describe('The date and time when the job started, in ISO 8601 format.'),
    completed_at: z.string().optional().describe('The date and time when the job completed, in ISO 8601 format.'),
    name: z.string().describe('The name of the job.'),
    steps: z.array(StepSchema).describe('The steps in the job.'),
    check_run_url: z.string().describe('The REST API URL for the check run associated with this job.'),
    labels: z.array(z.string()).describe('Labels for the workflow job.'),
    runner_id: z.number().optional().describe('The ID of the runner that is running this job.'),
    runner_name: z.string().optional().describe('The name of the runner that is running this job.'),
    runner_group_id: z.number().optional().describe('The ID of the runner group that is running this job.'),
    runner_group_name: z.string().optional().describe('The name of the runner group that is running this job.')
});

const OutputSchema = z
    .object({
        jobs: z.array(JobSchema).describe('The jobs that ran as part of the workflow run.'),
        total_count: z.number().describe('The total number of jobs in the workflow run across all pages.'),
        next_cursor: z.string().optional().describe('Pagination cursor for the next page of results. Omit if there are no more pages.')
    })
    .describe('Output containing the jobs that ran as part of a workflow run and pagination metadata.');

/**
 * @tags: [read]
 * @tagReason: This action performs a GET request to the GitHub API to list jobs for a workflow run.
 * @pitfalls: Jobs that are queued or still in progress omit conclusion, started_at, completed_at, and all runner fields because no runner has been assigned yet.
 */
const action = createAction({
    description: 'List the jobs that ran as part of a workflow run.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['actions:read'],
    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const perPage = 100;
        const page = input.cursor ? parseInt(input.cursor, 10) : 1;

        if (Number.isNaN(page) || page < 1) {
            throw new nango.ActionError({
                type: 'invalid_cursor',
                message: 'cursor must be a valid positive integer page number.'
            });
        }

        const response = await nango.get({
            // https://docs.github.com/en/rest/actions/workflow-jobs?apiVersion=2022-11-28#list-jobs-for-a-workflow-run
            endpoint: `/repos/${encodeURIComponent(input.owner)}/${encodeURIComponent(input.repo)}/actions/runs/${encodeURIComponent(String(input.run_id))}/jobs`,
            params: {
                per_page: perPage,
                page: page
            },
            retries: 3
        });

        const providerData = ProviderResponseSchema.parse(response.data);

        const jobs = providerData.jobs.map((job) => ({
            id: job.id,
            run_id: job.run_id,
            run_url: job.run_url,
            node_id: job.node_id,
            head_sha: job.head_sha,
            url: job.url,
            html_url: job.html_url,
            status: job.status,
            ...(job.conclusion != null && { conclusion: job.conclusion }),
            ...(job.started_at != null && { started_at: job.started_at }),
            ...(job.completed_at != null && { completed_at: job.completed_at }),
            name: job.name,
            steps: job.steps.map((step) => ({
                name: step.name,
                status: step.status,
                ...(step.conclusion != null && { conclusion: step.conclusion }),
                number: step.number,
                ...(step.started_at != null && { started_at: step.started_at }),
                ...(step.completed_at != null && { completed_at: step.completed_at })
            })),
            check_run_url: job.check_run_url,
            labels: job.labels,
            ...(job.runner_id != null && { runner_id: job.runner_id }),
            ...(job.runner_name != null && { runner_name: job.runner_name }),
            ...(job.runner_group_id != null && { runner_group_id: job.runner_group_id }),
            ...(job.runner_group_name != null && { runner_group_name: job.runner_group_name })
        }));

        const totalPages = Math.ceil(providerData.total_count / perPage);
        const nextCursor = page < totalPages ? String(page + 1) : undefined;

        return {
            jobs,
            total_count: providerData.total_count,
            ...(nextCursor !== undefined && { next_cursor: nextCursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
