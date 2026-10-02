import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const InputSchema = z
    .object({
        campaignId: z.number().int().positive().describe('Numeric ID of the email campaign to delete. Example: 42')
    })
    .describe('Input for deleting an email campaign.');

const OutputSchema = z
    .object({
        success: z.boolean().describe('True when the email campaign was deleted successfully.')
    })
    .describe('Result of deleting an email campaign.');

/**
 * @tags: [write, destructive]
 * @tagReason: Permanently deletes an email campaign from the provider.
 * @pitfalls: Only never-scheduled draft campaigns can be deleted; Brevo permanently refuses to delete a campaign once it has been scheduled or sent, failing with 403 permission_denied.
 */
const action = createAction({
    description: 'Delete an email campaign.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://developers.brevo.com/reference/deleteemailcampaign
            endpoint: `/emailCampaigns/${encodeURIComponent(input.campaignId)}`,
            // DELETE is idempotent here: repeating it cannot re-delete the campaign (a repeat just 404s), so bounded retries are safe.
            retries: 3
        };

        await nango.delete(config);

        return { success: true };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
