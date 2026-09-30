import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        organization_id_or_slug: z.string().describe('The ID or slug of the Sentry organization the alert rule belongs to. Example: "nangodev".'),
        workflow_id: z
            .string()
            .regex(/^[1-9]\d*$/, { message: 'workflow_id must be a positive integer' })
            .describe('The numeric ID of the alert rule (workflow) to delete, passed as a string. Example: "6086132".')
    })
    .describe('Identifies the Sentry alert rule (workflow) to delete.');

const OutputSchema = z
    .object({
        success: z.boolean().describe('True when Sentry confirmed the alert rule was deleted (HTTP 204 No Content).')
    })
    .describe('Confirmation that the alert rule was deleted.');

/**
 * @tags: [write, destructive]
 * @tagReason: Permanently deletes an alert rule in Sentry, a provider-side mutation that cannot be undone through this API.
 * @pitfalls: Deletion is permanent and cannot be undone through this API. The auth token needs alerts:write (or an org-level) scope or Sentry responds 403; an unknown workflow_id returns 404. Sentry documents this alert-rule API as beta and subject to change.
 */
const action = createAction({
    description: 'Delete an alert rule.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['alerts:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://docs.sentry.io/api/monitors/delete-an-alert/
        await nango.delete({
            endpoint: `/0/organizations/${encodeURIComponent(input.organization_id_or_slug)}/workflows/${encodeURIComponent(input.workflow_id)}/`,
            // DELETE is effect-idempotent (a repeat deletes nothing), so transient-failure retries are safe; a retry after a lost 204 surfaces as a 404 on an already-deleted rule.
            retries: 3
        });

        return { success: true };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
