import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        campaignId: z.string().describe('The unique identifier of the campaign to resume. Example: "cam_A1B2C3D4E5F6G7H8I9"')
    })
    .describe('Input for resuming a lemlist campaign');

const OutputSchema = z
    .object({
        id: z.string().describe('The unique identifier of the resumed campaign. Example: "cam_A1B2C3D4E5F6G7H8I9"'),
        state: z.string().describe('The campaign state after this call. Example: "running"')
    })
    .describe('Result of resuming a lemlist campaign');

const ProviderCampaignStateSchema = z.object({
    _id: z.string(),
    state: z.string()
});

/**
 * @tags: [write]
 * @tagReason: Starts/resumes a campaign, mutating its state on the provider, without reading any provider data first.
 * @pitfalls: Starting an already-running campaign fails with a 400 error instead of being a harmless no-op. Campaign status seen in subsequent reads can lag behind this call; treat the returned state as authoritative.
 */
const action = createAction({
    description: 'Resume or start a paused or draft campaign so it starts sequencing its leads again.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developer.lemlist.com/api-reference/endpoints/campaigns/start-campaign
        const response = await nango.post({
            endpoint: `/api/campaigns/${encodeURIComponent(input.campaignId)}/start`,
            // No retries: no idempotency key, and lemlist rejects starting an already-running campaign with a 400, so a retry after a lost response would surface a spurious error.
            // eslint-disable-next-line @nangohq/custom-integrations-linting/proxy-call-retries
            retries: 0
        });

        const campaign = ProviderCampaignStateSchema.parse(response.data);

        return {
            id: campaign._id,
            state: campaign.state
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
