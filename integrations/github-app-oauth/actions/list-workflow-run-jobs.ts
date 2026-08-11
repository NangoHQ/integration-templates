import { z } from 'zod';
import { createAction } from 'nango';

const JobStepSchema = z.object({
    name: z.string().describe('Name of the step.'),
    status: z.string().describe('Status of the step. Example: "completed", "in_progress".'),
    conclusion: z.string().nullable().optional().describe('Conclusion of the step. Example: "success", "failure". Null when the step has not completed.'),
    number: z.number().describe('Step number in the job sequence.'),
    started_at: z.string().nullable().optional().describe('ISO 8601 timestamp when the step started. Null if not started.'),
    completed_at: z.string().nullable().optional().describe('ISO 8601 timestamp when the step completed. Null if not completed.')
});

const JobSchema = z.object({
    id: z.number().describe('Unique identifier of the job.'),
    run_id: z.number().describe('Identifier of the workflow run this job belongs to.'),
    workflow_name: z.string().nullable().optional().describe('Name of the workflow.'),
    head_branch: z.string().nullable().optional().describe('Branch the workflow run was triggered from.'),
    run_url: z.string().describe('API URL for the workflow run.'),
    run_attempt: z.number().describe('Attempt number of the workflow run.'),
    node_id: z.string().describe('Global node ID for the job.'),
    head_sha: z.string().describe('SHA of the commit the job ran against.'),
    url: z.string().describe('API URL for the job.'),
    html_url: z.string().describe('HTML URL for the job on GitHub.'),
    status: z.string().describe('Overall status of the job. Example: "queued", "in_progress", "completed".'),
    conclusion: z.string().nullable().optional().describe('Overall conclusion of the job. Example: "success", "failure". Null when the job has not completed.'),
    created_at: z.string().describe('ISO 8601 timestamp when the job was created.'),
    started_at: z.string().nullable().optional().describe('ISO 8601 timestamp when the job started. Null if not started.'),
    completed_at: z.string().nullable().optional().describe('ISO 8601 timestamp when the job completed. Null if not completed.'),
    name: z.string().describe('Name of the job.'),
    steps: z.array(JobStepSchema).describe('Steps executed within the job.'),
    check_run_url: z.string().describe('API URL for the associated check run.'),
    labels: z.array(z.string()).describe('Runner labels assigned to the job.'),
    runner_id: z.number().nullable().optional().describe('Identifier of the runner that executed the job. Null if not assigned.'),
    runner_name: z.string().nullable().optional().describe('Name of the runner that executed the job. Null if not assigned.'),
    runner_group_id: z.number().nullable().optional().describe('Identifier of the runner group. Null if not assigned.'),
    runner_group_name: z.string().nullable().optional().describe('Name of the runner group. Null if not assigned.')
});

const InputSchema = z
    .object({
        owner: z.string().describe('Repository owner name. Example: "nango-provisioned-apps".'),
        repo: z.string().describe('Repository name. Example: "nango".'),
        run_id: z.number().int().positive().describe('Unique identifier of the workflow run. Example: 31489919982.'),
        cursor: z.string().optional().describe('Pagination cursor. For this endpoint this is the page number as a string. Omit for the first page.'),
        per_page: z.number().int().min(1).max(100).optional().describe('Number of results per page. Maximum is 100. Defaults to 30.')
    })
    .describe('Input parameters for listing workflow run jobs.');

const OutputSchema = z
    .object({
        jobs: z.array(JobSchema).describe('Jobs that ran as part of the workflow run.'),
        next_cursor: z.string().optional().describe('Pagination cursor for the next page. Present when more results may be available.')
    })
    .describe('Output of listing workflow run jobs.');

/**
 * @tags: [read]
 * @tagReason: Reads job metadata from a completed or in-progress workflow run.
 * @pitfalls: GitHub returns jobs for the latest workflow run attempt only, and the steps array remains empty while a job is queued or in progress.
 */
const action = createAction({
    description: 'List the jobs that ran as part of a workflow run.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['actions:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const page = input.cursor ? parseInt(input.cursor, 10) : 1;
        if (isNaN(page) || page < 1) {
            throw new nango.ActionError({
                type: 'invalid_cursor',
                message: 'cursor must be a positive integer string representing the page number.'
            });
        }

        const perPage = input.per_page ?? 30;

        // https://docs.github.com/rest/actions/workflow-jobs#list-jobs-for-a-workflow-run
        const response = await nango.get({
            endpoint: `repos/${encodeURIComponent(input.owner)}/${encodeURIComponent(input.repo)}/actions/runs/${encodeURIComponent(String(input.run_id))}/jobs`,
            params: {
                page: String(page),
                per_page: String(perPage)
            },
            retries: 3
        });

        const providerResponse = z
            .object({
                total_count: z.number().optional(),
                jobs: z.array(z.unknown()).optional()
            })
            .parse(response.data);

        const jobs = providerResponse.jobs ?? [];
        const parsedJobs = jobs.map((job) => JobSchema.parse(job));

        const hasMore = parsedJobs.length === perPage;

        return {
            jobs: parsedJobs,
            ...(hasMore && { next_cursor: String(page + 1) })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
