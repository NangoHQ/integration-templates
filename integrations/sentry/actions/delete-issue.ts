import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const InputSchema = z
    .object({
        organization_id_or_slug: z.string().describe('The ID or slug of the organization the issue belongs to. Example: "my-org".'),
        issue_id: z.string().describe('The numeric ID of the issue to permanently delete. Example: "1234567890".')
    })
    .describe('Input for deleting a Sentry issue.');

const OutputSchema = z
    .object({
        success: z.boolean().describe('True when Sentry accepted the issue for asynchronous deletion.')
    })
    .describe('Result of the delete issue request.');

/**
 * @tags: [write, destructive]
 * @tagReason: Permanently deletes an issue and its events in Sentry.
 * @pitfalls: Requires an API token with the event:admin scope and fails with 403 otherwise. Deletion is permanent and queued asynchronously, so the issue may still appear in reads briefly after success.
 */
const action = createAction({
    description: 'Permanently delete an issue.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['event:admin'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://docs.sentry.io/api/events/remove-an-issue/
            endpoint: `/0/organizations/${encodeURIComponent(input.organization_id_or_slug)}/issues/${encodeURIComponent(input.issue_id)}/`,
            // retries 0: this permanently queues the issue for deletion and a retry after a lost response would repeat the mutation (or 404 once the issue is already gone).
            // eslint-disable-next-line @nangohq/custom-integrations-linting/proxy-call-retries -- deliberate 0 for a non-idempotent delete; the rule's auto-fix to 10 would be unsafe here.
            retries: 0
        };

        await nango.delete(config);

        return { success: true };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
