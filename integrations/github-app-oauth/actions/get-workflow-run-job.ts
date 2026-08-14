import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        owner: z.string().describe('The account owner of the repository. Example: "octocat"'),
        repo: z.string().describe('The name of the repository. Example: "hello-world"'),
        job_id: z.number().int().positive().describe('The unique identifier of the job. Must come from list-workflow-run-jobs, not the run_id. Example: 12345')
    })
    .describe('Input parameters for retrieving a single workflow run job.');

const StepSchema = z.object({
    status: z.string().describe('The current status of the step. Example: "completed"'),
    conclusion: z.string().nullable().describe('The outcome of the step. Example: "success"'),
    name: z.string().describe('The name of the step. Example: "Set up job"'),
    number: z.number().describe('The step number in the job execution sequence. Example: 1'),
    started_at: z.string().nullable().optional().describe('When the step started, in ISO 8601 format.'),
    completed_at: z.string().nullable().optional().describe('When the step completed, in ISO 8601 format.')
});

const OutputSchema = z
    .object({
        id: z.number().describe('The unique identifier of the job. Example: 12345'),
        run_id: z.number().describe('The unique identifier of the workflow run. Example: 67890'),
        run_url: z.string().describe('The REST API URL for the workflow run.'),
        run_attempt: z.number().optional().describe('The attempt number of the workflow run. Example: 1'),
        node_id: z.string().describe('The Node ID of the job.'),
        head_sha: z.string().describe('The SHA of the commit the job is running against.'),
        url: z.string().describe('The REST API URL for the job.'),
        html_url: z.string().nullable().describe('The HTML URL for the job in the GitHub web interface.'),
        status: z.string().describe('The current status of the job. Example: "completed"'),
        conclusion: z.string().nullable().describe('The outcome of the job. Example: "success"'),
        created_at: z.string().describe('When the job was created, in ISO 8601 format.'),
        started_at: z.string().describe('When the job started, in ISO 8601 format.'),
        completed_at: z.string().nullable().describe('When the job completed, in ISO 8601 format.'),
        name: z.string().describe('The name of the job. Example: "build"'),
        steps: z.array(StepSchema).describe('The steps executed in this job.'),
        check_run_url: z.string().describe('The REST API URL for the check run associated with this job.'),
        labels: z.array(z.string()).describe('The labels of the runner executing this job.'),
        runner_id: z.number().nullable().describe('The ID of the runner executing this job.'),
        runner_name: z.string().nullable().describe('The name of the runner executing this job.'),
        runner_group_id: z.number().nullable().describe('The ID of the runner group.'),
        runner_group_name: z.string().nullable().describe('The name of the runner group.'),
        workflow_name: z.string().nullable().optional().describe('The name of the workflow.'),
        head_branch: z.string().nullable().optional().describe('The branch the workflow run was triggered from.')
    })
    .describe('Details of a single workflow run job, including execution steps, runner information, and outcome.');

/**
 * @tags: [read]
 * @tagReason: Retrieves details of a single workflow run job from the GitHub API.
 * @pitfalls: conclusion and completed_at are null while the job is still running.
 */
const action = createAction({
    description: 'Get details of a single job within a workflow run.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['actions:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://docs.github.com/en/rest/actions/workflow-jobs?apiVersion=2022-11-28#get-a-job-for-a-workflow-run
            endpoint: `/repos/${encodeURIComponent(input.owner)}/${encodeURIComponent(input.repo)}/actions/jobs/${encodeURIComponent(String(input.job_id))}`,
            retries: 3
        });

        const providerJob = OutputSchema.parse(response.data);

        return providerJob;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
