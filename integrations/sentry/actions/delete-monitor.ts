import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        organization_id_or_slug: z.string().describe('The ID or slug of the organization the monitor belongs to. Example: "my-org-slug".'),
        monitor_id_or_slug: z.string().describe('The ID or slug of the monitor to delete. Example: "my-monitor-slug".')
    })
    .describe('Parameters identifying the monitor to delete.');

const OutputSchema = z
    .object({
        success: z.boolean().describe('True when the monitor was deleted successfully.')
    })
    .describe('Result of the monitor deletion.');

/**
 * @tags: [write, destructive]
 * @tagReason: Calls the provider API to permanently delete a monitor, a destructive write that cannot be reversed through the API.
 * @pitfalls: The connection's API token must include the alerts:write, project:admin, or project:write scope, otherwise the call fails with a permission error.
 */
const action = createAction({
    description: 'Delete a monitor.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://docs.sentry.io/api/crons/delete-a-monitor-or-monitor-environments/
        await nango.delete({
            endpoint: `/0/organizations/${encodeURIComponent(input.organization_id_or_slug)}/monitors/${encodeURIComponent(input.monitor_id_or_slug)}/`,
            // Delete is safe to retry (a repeated delete is a no-op once the monitor is gone) but kept to a single retry because it is destructive.
            retries: 1
        });

        return { success: true };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
