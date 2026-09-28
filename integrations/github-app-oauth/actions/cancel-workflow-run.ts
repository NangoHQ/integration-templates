import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const InputSchema = z
    .object({
        owner: z.string().describe('Repository owner (organization or user). Example: "nango-provisioned-apps"'),
        repo: z.string().describe('Repository name without the .git extension. Example: "nango"'),
        run_id: z.number().int().describe('Unique identifier of the workflow run to cancel. Example: 1654444444')
    })
    .describe('Input for canceling a workflow run');

const OutputSchema = z
    .object({
        success: z.boolean().describe('True when GitHub accepted the cancellation request (HTTP 202).')
    })
    .describe('Result of the workflow run cancellation request');

/**
 * @tags: [write]
 * @tagReason: Sends a cancellation request that mutates the workflow run's state on GitHub.
 * @pitfalls: Cancellation is asynchronous: a successful response only means GitHub accepted the request, and the run may take a moment to reach the cancelled state. Jobs guarded by always() conditions can keep running after a cancel; GitHub provides a separate force-cancel endpoint for runs that do not respond. GitHub returns 409 Conflict when the run can no longer be cancelled, for example because it has already completed.
 */
const action = createAction({
    description: 'Cancel a queued or in-progress workflow run.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['actions:write'],
    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://docs.github.com/en/rest/actions/workflow-runs#cancel-a-workflow-run
            endpoint: `/repos/${encodeURIComponent(input.owner)}/${encodeURIComponent(input.repo)}/actions/runs/${input.run_id}/cancel`,
            // Write operation: a single retry only covers transient network/rate-limit failures while minimizing duplicate-cancel risk
            retries: 1
        };

        await nango.post(config);

        return { success: true };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
