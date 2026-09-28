import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        owner: z.string().describe('The account owner of the repository. The name is not case sensitive. Example: "octocat"'),
        repo: z.string().describe('The name of the repository without the .git extension. The name is not case sensitive. Example: "hello-world"'),
        run_id: z.number().int().describe('The unique identifier of the workflow run to re-run. Example: 30433642'),
        enable_debug_logging: z.boolean().optional().describe('Whether to enable debug logging for the re-run. Defaults to false.')
    })
    .describe('Input for re-running a workflow run');

const OutputSchema = z.null().describe('Empty response returned when the re-run is successfully triggered.');

/**
 * @tags: [write]
 * @tagReason: Triggers a re-run of a workflow run, which queues new job executions and mutates provider state.
 * @pitfalls: A workflow run can only be re-run within 30 days of its initial run; after 50 re-runs, further attempts produce a failed run instead of executing. The re-run reuses the original commit SHA, git ref, and the privileges of the actor who originally triggered the run, not the latest state of the branch.
 */
const action = createAction({
    description: 'Re-run a completed workflow run',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['actions:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://docs.github.com/en/rest/actions/workflow-runs#re-run-a-workflow
        await nango.post({
            endpoint: `/repos/${encodeURIComponent(input.owner)}/${encodeURIComponent(input.repo)}/actions/runs/${input.run_id}/rerun`,
            data: {
                ...(input.enable_debug_logging !== undefined && { enable_debug_logging: input.enable_debug_logging })
            },
            retries: 3
        });

        return null;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
