import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        owner: z.string().describe('The account owner of the repository. Example: "nango-provisioned-apps".'),
        repo: z.string().describe('The name of the repository. Example: "nango".'),
        run_id: z.number().describe('The unique identifier of the workflow run to re-run. Example: 1234567890.')
    })
    .describe('Input for re-running a completed GitHub Actions workflow run.');

/**
 * @tags: [write]
 * @tagReason: Triggers a new execution of a completed workflow run on GitHub Actions.
 */
const action = createAction({
    description: 'Re-run a completed workflow run.',
    version: '1.0.0',
    input: InputSchema,
    output: z.null(),
    scopes: ['actions:write'],

    exec: async (nango, input): Promise<null> => {
        await nango.post({
            // https://docs.github.com/rest/actions/workflow-runs#re-run-a-workflow
            endpoint: `/repos/${encodeURIComponent(input.owner)}/${encodeURIComponent(input.repo)}/actions/runs/${encodeURIComponent(String(input.run_id))}/rerun`,
            retries: 3
        });

        return null;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
