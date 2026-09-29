import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        owner: z.string().describe('Account owner of the repository. The name is not case sensitive.'),
        repo: z.string().describe('Repository name. The name is not case sensitive.'),
        job_id: z.number().describe('The unique identifier of the job. This is returned by list-workflow-run-jobs and is not the same as the workflow run_id.')
    })
    .describe('Input for fetching a single workflow run job.');

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
    steps: z.array(ProviderStepSchema).optional(),
    check_run_url: z.string(),
    labels: z.array(z.string()),
    runner_id: z.number().nullable().optional(),
    runner_name: z.string().nullable().optional(),
    runner_group_id: z.number().nullable().optional(),
    runner_group_name: z.string().nullable().optional()
});

const StepSchema = z.object({
    name: z.string().describe('Name of the step.'),
    status: z.string().describe('Status of the step. Example: "completed"'),
    conclusion: z.string().optional().describe('Conclusion of the step. Example: "success". Omitted when the step is still running or null.'),
    number: z.number().describe('Step number within the job.'),
    started_at: z.string().optional().describe('ISO 8601 timestamp when the step started. Omitted when null or not present.'),
    completed_at: z.string().optional().describe('ISO 8601 timestamp when the step completed. Omitted when null or not present.')
});

const OutputSchema = z
    .object({
        id: z.number().describe('Unique identifier of the job.'),
        run_id: z.number().describe('Unique identifier of the workflow run this job belongs to.'),
        run_url: z.string().describe('API URL of the workflow run.'),
        node_id: z.string().describe('Global node ID for the job.'),
        head_sha: z.string().describe('SHA of the commit this job is associated with.'),
        url: z.string().describe('API URL of the job.'),
        html_url: z.string().describe('HTML URL of the job in the GitHub UI.'),
        status: z.string().describe('Current status of the job. Example: "completed"'),
        conclusion: z
            .string()
            .optional()
            .describe('Conclusion of the job after it has completed. Example: "success". Omitted when the job is still running or null.'),
        started_at: z.string().optional().describe('ISO 8601 timestamp when the job started. Omitted when null or not present.'),
        completed_at: z.string().optional().describe('ISO 8601 timestamp when the job completed. Omitted when null or not present.'),
        name: z.string().describe('Name of the job.'),
        steps: z.array(StepSchema).optional().describe('Steps executed within this job.'),
        check_run_url: z.string().describe('API URL of the check run associated with this job.'),
        labels: z.array(z.string()).describe('Labels for the self-hosted runner that executed this job, if applicable.'),
        runner_id: z.number().optional().describe('Unique identifier of the runner that executed this job. Omitted when null or not present.'),
        runner_name: z.string().optional().describe('Name of the runner that executed this job. Omitted when null or not present.'),
        runner_group_id: z.number().optional().describe('Unique identifier of the runner group that executed this job. Omitted when null or not present.'),
        runner_group_name: z.string().optional().describe('Name of the runner group that executed this job. Omitted when null or not present.')
    })
    .describe('Details of a single job within a workflow run.');

/**
 * @tags: [read]
 * @tagReason: Reads a single workflow run job from the GitHub API.
 * @pitfalls: job_id must come from list-workflow-run-jobs and is not the same as the workflow run_id. Re-running a workflow creates new jobs for the same run, so a cached job_id always reflects the original attempt and never updates for later reruns.
 */
const action = createAction({
    description: 'Get details of a single job within a workflow run.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['actions:read'],
    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://docs.github.com/rest/actions/workflow-jobs#get-a-job-for-a-workflow-run
            endpoint: `repos/${encodeURIComponent(input.owner)}/${encodeURIComponent(input.repo)}/actions/jobs/${encodeURIComponent(String(input.job_id))}`,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Workflow run job not found',
                job_id: input.job_id
            });
        }

        const providerJob = ProviderJobSchema.parse(response.data);

        const mapStep = (step: z.infer<typeof ProviderStepSchema>): z.infer<typeof StepSchema> => ({
            name: step.name,
            status: step.status,
            number: step.number,
            ...(step.conclusion != null && { conclusion: step.conclusion }),
            ...(step.started_at != null && { started_at: step.started_at }),
            ...(step.completed_at != null && { completed_at: step.completed_at })
        });

        return {
            id: providerJob.id,
            run_id: providerJob.run_id,
            run_url: providerJob.run_url,
            node_id: providerJob.node_id,
            head_sha: providerJob.head_sha,
            url: providerJob.url,
            html_url: providerJob.html_url,
            status: providerJob.status,
            name: providerJob.name,
            check_run_url: providerJob.check_run_url,
            labels: providerJob.labels,
            ...(providerJob.conclusion != null && { conclusion: providerJob.conclusion }),
            ...(providerJob.started_at != null && { started_at: providerJob.started_at }),
            ...(providerJob.completed_at != null && { completed_at: providerJob.completed_at }),
            ...(providerJob.steps != null && { steps: providerJob.steps.map(mapStep) }),
            ...(providerJob.runner_id != null && { runner_id: providerJob.runner_id }),
            ...(providerJob.runner_name != null && { runner_name: providerJob.runner_name }),
            ...(providerJob.runner_group_id != null && { runner_group_id: providerJob.runner_group_id }),
            ...(providerJob.runner_group_name != null && { runner_group_name: providerJob.runner_group_name })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
