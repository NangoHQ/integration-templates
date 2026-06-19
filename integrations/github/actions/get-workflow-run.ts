import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    owner: z.string().describe('The account owner of the repository. Example: "viictoo"'),
    repo: z.string().describe('The name of the repository. Example: "api-playground2"'),
    run_id: z.number().describe('The unique identifier of the workflow run. Example: 123456789'),
    exclude_pull_requests: z.boolean().optional().describe('If true, pull requests are omitted from the response.')
});

const WorkflowRunSchema = z.object({
    id: z.number(),
    name: z.string().nullable(),
    node_id: z.string(),
    head_branch: z.string().nullable(),
    head_sha: z.string(),
    path: z.string(),
    run_number: z.number(),
    run_attempt: z.number().optional(),
    event: z.string(),
    status: z.string().nullable(),
    conclusion: z.string().nullable(),
    workflow_id: z.number(),
    url: z.string(),
    html_url: z.string(),
    created_at: z.string(),
    updated_at: z.string(),
    run_started_at: z.string().optional(),
    jobs_url: z.string(),
    logs_url: z.string(),
    check_suite_url: z.string(),
    artifacts_url: z.string(),
    cancel_url: z.string(),
    rerun_url: z.string(),
    workflow_url: z.string(),
    display_title: z.string()
});

const action = createAction({
    description: 'Retrieve a workflow run with status and conclusion details.',
    version: '1.0.1',
    input: InputSchema,
    output: WorkflowRunSchema,

    exec: async (nango, input): Promise<z.infer<typeof WorkflowRunSchema>> => {
        // https://docs.github.com/en/rest/actions/workflow-runs#get-a-workflow-run
        const response = await nango.get({
            endpoint: `/repos/${encodeURIComponent(input.owner)}/${encodeURIComponent(input.repo)}/actions/runs/${input.run_id}`,
            params: {
                ...(input.exclude_pull_requests !== undefined && { exclude_pull_requests: String(input.exclude_pull_requests) })
            },
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Workflow run not found',
                run_id: input.run_id,
                owner: input.owner,
                repo: input.repo
            });
        }

        return WorkflowRunSchema.parse(response.data);
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
