import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        owner: z.string().describe('The account owner of the repository. The name is not case sensitive. Example: "nango-provisioned-apps"'),
        repo: z.string().describe('The name of the repository without the .git extension. The name is not case sensitive. Example: "nango"'),
        workflow_id: z
            .union([z.number().int(), z.string()])
            .describe('The ID of the workflow (integer) or the workflow file name (string). Example: 331870956 or "nango-registry-test.yml"'),
        ref: z.string().describe('The git reference for the workflow run. The reference can be a branch or tag name. Example: "master"'),
        inputs: z
            .record(z.string(), z.unknown())
            .optional()
            .describe(
                'Input keys and values configured in the workflow file under the workflow_dispatch trigger. Maximum of 10 properties. Omit when the workflow defines no inputs.'
            )
    })
    .describe('Parameters identifying the workflow to dispatch and the git reference to run it against');

const OutputSchema = z.null().describe('No content. The API responds with HTTP 204 and an empty body when the dispatch is accepted.');

/**
 * @tags: [write]
 * @tagReason: Manually triggers a new workflow run in the provider, which is a provider-side mutation that reads nothing.
 * @pitfalls: The workflow must define a workflow_dispatch trigger and exist on the repository's default branch, otherwise the dispatch is rejected. Inputs that are not defined in the workflow (or have the wrong type) are silently ignored in favor of the workflow's defaults. A successful dispatch returns no run ID; the run starts asynchronously and appears in workflow run listings shortly after.
 */
const action = createAction({
    description: 'Manually trigger a workflow run (the workflow must have a workflow_dispatch trigger defined).',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['actions:write'],
    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://docs.github.com/en/rest/actions/workflows#create-a-workflow-dispatch-event
        await nango.post({
            endpoint: `/repos/${encodeURIComponent(input.owner)}/${encodeURIComponent(input.repo)}/actions/workflows/${encodeURIComponent(String(input.workflow_id))}/dispatches`,
            data: {
                ref: input.ref,
                ...(input.inputs !== undefined && { inputs: input.inputs })
            },
            retries: 1
        });

        return null;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
