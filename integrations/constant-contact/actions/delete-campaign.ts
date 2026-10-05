import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const InputSchema = z
    .object({
        campaign_id: z.string().describe('The unique ID of the email campaign to delete. Example: "11024d9e-4c3f-4f6a-9d1b-2f3e8a1b0c2d".')
    })
    .describe('Identifies the email campaign to delete.');

const OutputSchema = z
    .object({
        success: z.boolean().describe('Whether the campaign was successfully deleted.')
    })
    .describe('Result of the delete campaign request.');

/**
 * @tags: [write, destructive]
 * @tagReason: Permanently deletes an email campaign through the provider API.
 * @pitfalls: Deletion is permanent and takes effect immediately; the campaign is gone as soon as the call succeeds and any later fetch of it fails with a not-found error.
 */
const action = createAction({
    description: 'Delete an email campaign',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['campaign_data'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://v3.developer.constantcontact.com/api_reference/index.html (DELETE /v3/emails/{campaign_id})
            endpoint: `/v3/emails/${encodeURIComponent(input.campaign_id)}`,
            // No retries: a delete is destructive, and retrying after a lost response would repeat the delete attempt.
            // eslint-disable-next-line @nangohq/custom-integrations-linting/proxy-call-retries
            retries: 0
        };
        await nango.delete(config);

        return { success: true };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
