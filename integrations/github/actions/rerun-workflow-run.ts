import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    owner: z.string().describe('The account owner of the repository. Example: "octocat"'),
    repo: z.string().describe('The name of the repository. Example: "Hello-World"'),
    run_id: z.number().describe('The unique identifier of the workflow run. Example: 30433642'),
    enable_debug_logging: z.boolean().optional().describe('Whether to enable debug logging for the re-run. Default: false')
});

const OutputSchema = z.object({
    success: z.boolean(),
    message: z.string()
});

const action = createAction({
    description: 'Rerun a completed or failed workflow run.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['repo'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://docs.github.com/en/rest/actions/workflow-runs?apiVersion=2022-11-28#re-run-a-workflow
            endpoint: `/repos/${encodeURIComponent(input.owner)}/${encodeURIComponent(input.repo)}/actions/runs/${encodeURIComponent(String(input.run_id))}/rerun`,
            data: {
                ...(input.enable_debug_logging !== undefined && { enable_debug_logging: input.enable_debug_logging })
            },
            retries: 3
        });

        // GitHub returns 201/202/204 on success depending on the API version and state
        if (response.status === 200 || response.status === 201 || response.status === 202 || response.status === 204) {
            return {
                success: true,
                message: 'Workflow run re-run successfully triggered'
            };
        }

        throw new nango.ActionError({
            type: 'unexpected_response',
            message: 'Unexpected response from GitHub API',
            status: response.status,
            data: response.data
        });
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
