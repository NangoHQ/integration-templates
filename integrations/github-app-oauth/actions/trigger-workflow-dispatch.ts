import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        owner: z.string().describe('Repository owner. Example: "nango-provisioned-apps"'),
        repo: z.string().describe('Repository name. Example: "nango"'),
        workflow_id: z.union([z.string(), z.number()]).describe('Workflow ID or workflow file name. Example: 331870956 or "nango-registry-test.yml"'),
        ref: z.string().describe('Git ref (branch, tag, or SHA) to run the workflow against. Example: "master"'),
        inputs: z
            .record(z.string(), z.string())
            .optional()
            .describe('Optional map of input names to values, only if the workflow defines workflow_dispatch inputs.')
    })
    .describe('Input to manually trigger a GitHub Actions workflow run via workflow_dispatch.');

const OutputSchema = z.null().describe('No content returned on success.');

/**
 * @tags: [write]
 * @tagReason: Triggers a new workflow run on the repository.
 * @pitfalls: The workflow must define a workflow_dispatch trigger and be present on the default branch; the triggered run may take a few moments to appear in run listings.
 */
const action = createAction({
    description: 'Manually trigger a workflow run (the workflow must have a workflow_dispatch trigger defined).',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['actions:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        await nango.post({
            // https://docs.github.com/rest/actions/workflows#create-a-workflow-dispatch-event
            endpoint: `/repos/${encodeURIComponent(input.owner)}/${encodeURIComponent(input.repo)}/actions/workflows/${encodeURIComponent(String(input.workflow_id))}/dispatches`,
            data: {
                ref: input.ref,
                ...(input.inputs !== undefined && { inputs: input.inputs })
            },
            // Kept low: this POST is not idempotent, so retrying a request whose response was lost
            // (while GitHub still accepted the dispatch) would trigger duplicate workflow runs.
            retries: 1
        });

        return null;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
