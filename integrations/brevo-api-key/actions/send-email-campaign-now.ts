import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const InputSchema = z
    .object({
        campaignId: z.number().int().positive().describe('ID of the draft email campaign to send immediately. Example: 42')
    })
    .describe('Input for sending an existing draft email campaign immediately');

const OutputSchema = z
    .object({
        success: z.boolean().describe('True when Brevo accepted the campaign for immediate sending (204 No Content)'),
        campaignId: z.number().describe('ID of the campaign that was sent')
    })
    .describe('Confirmation that the email campaign was sent');

/**
 * @tags: [write, destructive]
 * @tagReason: Triggers the immediate dispatch of a live email campaign to all of its recipients, an irreversible provider mutation.
 * @pitfalls: Sending is irreversible: recipients are emailed immediately and a sent campaign can never be deleted via the API. The campaign must still be a draft with valid recipients and content, and Brevo rejects the send when the account lacks sufficient credits. A successful response only confirms the send was accepted, not delivered; the campaign can still end up suspended rather than sent, so check its status afterwards.
 */
const action = createAction({
    description: 'Send an existing draft email campaign immediately.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://developers.brevo.com/reference/send-email-campaign-now
            endpoint: `/emailCampaigns/${encodeURIComponent(String(input.campaignId))}/sendNow`,
            data: {},
            // No retries: this dispatch-style POST is not idempotent and a retry after a lost 204 response would attempt to send the campaign twice.
            // eslint-disable-next-line @nangohq/custom-integrations-linting/proxy-call-retries
            retries: 0
        };

        await nango.post(config);

        return {
            success: true,
            campaignId: input.campaignId
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
