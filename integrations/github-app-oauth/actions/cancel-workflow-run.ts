import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        owner: z.string().describe('The account owner of the repository. Example: "nango-provisioned-apps"'),
        repo: z.string().describe('The name of the repository. Example: "nango"'),
        run_id: z.number().describe('The unique identifier of the workflow run to cancel. Example: 31510968015')
    })
    .describe('Input parameters for canceling a workflow run.');

const OutputSchema = z.null().describe('Empty response confirming the cancellation was accepted.');

/**
 * @tags: [write]
 * @tagReason: Cancels an in-progress workflow run, which mutates the run state on GitHub.
 * @pitfalls: GitHub processes cancellation asynchronously so the run may continue briefly after a successful response, and a 409-class error is returned if the run has already completed.
 */
const action = createAction({
    description: 'Cancel an in-progress workflow run.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['actions:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://docs.github.com/rest/actions/workflow-runs#cancel-a-workflow-run
        await nango.post({
            endpoint: `repos/${encodeURIComponent(input.owner)}/${encodeURIComponent(input.repo)}/actions/runs/${input.run_id}/cancel`,
            retries: 3
        });

        return null;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
