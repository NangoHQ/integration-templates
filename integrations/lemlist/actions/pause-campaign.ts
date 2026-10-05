import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const InputSchema = z
    .object({
        campaignId: z.string().describe('Unique identifier of the campaign to pause. Example: "cam_A1B2C3D4E5F6G7H8I9"')
    })
    .describe('Input for pausing a lemlist campaign.');

const PauseCampaignResponseSchema = z.object({
    _id: z.string(),
    state: z.string()
});

const OutputSchema = z
    .object({
        _id: z.string().describe('Unique identifier of the paused campaign. Example: "cam_A1B2C3D4E5F6G7H8I9"'),
        state: z.string().describe('Campaign state after this call, as reported by lemlist. Expected to be "paused" when the campaign was running.')
    })
    .describe('Result of pausing a lemlist campaign.');

/**
 * @tags: [write]
 * @tagReason: Mutates provider state by pausing a running campaign for all its leads.
 * @pitfalls: Fails with a 400 error when the campaign is not currently running rather than silently no-oping. The returned state is the authoritative result of this call and can differ from the campaign status shown by list or get endpoints afterward.
 */
const action = createAction({
    description: 'Pause a running campaign (stops sending/sequencing for all its leads).',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://developer.lemlist.com/api-reference/endpoints/campaigns/pause-campaign
            endpoint: `/api/campaigns/${encodeURIComponent(input.campaignId)}/pause`,
            // No retries: a retry after a lost response would hit lemlist's 400 "campaign not running" error even though the pause already took effect.
            // eslint-disable-next-line @nangohq/custom-integrations-linting/proxy-call-retries -- retries: 0 is deliberate for this non-idempotent mutation
            retries: 0
        };

        const response = await nango.post(config);

        const campaign = PauseCampaignResponseSchema.parse(response.data);

        return {
            _id: campaign._id,
            state: campaign.state
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
