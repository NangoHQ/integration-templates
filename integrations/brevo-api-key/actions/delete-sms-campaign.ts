import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const InputSchema = z
    .object({
        campaignId: z.number().int().describe('ID of the SMS campaign to delete. Example: 42')
    })
    .describe('Input for deleting an SMS campaign');

const OutputSchema = z
    .object({
        success: z.boolean().describe('True when the SMS campaign was deleted successfully'),
        campaignId: z.number().int().describe('ID of the SMS campaign that was deleted. Example: 42')
    })
    .describe('Result of the SMS campaign deletion');

/**
 * @tags: [write, destructive]
 * @tagReason: Permanently deletes an SMS campaign via the provider API.
 * @pitfalls: A campaign can only be deleted while it is still a draft; attempting to delete one that is already scheduled, queued, in process, or sent is refused with a 403 permission_denied error.
 */
const action = createAction({
    description: 'Delete an SMS campaign.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://developers.brevo.com/reference/deletesmscampaign
            endpoint: `/smsCampaigns/${encodeURIComponent(input.campaignId)}`,
            // Not retried: a retry after a lost 204 response would 404 on the already-deleted campaign and surface a false failure.
            // eslint-disable-next-line @nangohq/custom-integrations-linting/proxy-call-retries
            retries: 0
        };
        await nango.delete(config);

        return {
            success: true,
            campaignId: input.campaignId
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
