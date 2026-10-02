import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const CAMPAIGNS_PAGE_LIMIT = 100;

const CampaignSchema = z
    .object({
        id: z.string().describe("The campaign's unique lemlist identifier (the `_id` field). Example: 'cam_vyzp8v33RBTfNQRvz'"),
        name: z.string().describe("The campaign's display name"),
        status: z.string().describe("The campaign's lifecycle status as reported by the list endpoint, e.g. 'draft', 'running' or 'paused'"),
        sequenceId: z.string().describe("Identifier of the campaign's messaging sequence. Example: 'seq_8Xp3uSRQrBAdTGffc'"),
        emoji: z.string().optional().describe("The campaign's emoji icon, when one is set"),
        createdAt: z.string().describe('ISO 8601 timestamp of when the campaign was created'),
        createdBy: z.string().describe("Lemlist user id of the campaign's creator. Example: 'usr_22HzEMYb8ZvdNstrC'")
    })
    .describe('A lemlist campaign with its core metadata as returned by GET /api/campaigns');

// Internal schema for parsing the provider response; not part of the public model.
const LemlistCampaignSchema = z.object({
    _id: z.string(),
    name: z.string(),
    status: z.string(),
    sequenceId: z.string(),
    emoji: z.string().optional(),
    createdAt: z.string(),
    createdBy: z.string()
});

const CheckpointSchema = z.object({
    offset: z.number().int().nonnegative().describe('Zero-based campaign offset to resume from during an in-progress full refresh.')
});

const sync = createSync({
    description:
        'Full refresh of every lemlist campaign in the team (name, status, sequence id, creator). Note: lemlist has no campaign-deletion API, so a record flagged as deleted only means the campaign no longer appears in GET /api/campaigns (e.g. excluded by a filter the endpoint does not expose), not that it was actually destroyed.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        Campaign: CampaignSchema
    },

    exec: async (nango) => {
        const checkpoint = CheckpointSchema.partial().parse((await nango.getCheckpoint()) ?? {});
        let offset = checkpoint.offset ?? 0;

        // Full refresh with delete detection: GET /api/campaigns has no changed-since
        // filter or delete feed, so every run still scans the full dataset. The API does
        // support offset pagination, which lets the sync resume mid-scan after an interruption.
        await nango.trackDeletesStart('Campaign');

        const proxyConfig: ProxyConfiguration = {
            // https://developer.lemlist.com/api-reference/endpoints/campaigns/get-many-campaigns
            endpoint: '/api/campaigns',
            params: {
                version: 'v2',
                sortBy: 'createdAt',
                sortOrder: 'asc'
            },
            paginate: {
                type: 'offset',
                offset_name_in_request: 'offset',
                offset_start_value: offset,
                offset_calculation_method: 'by-response-size',
                limit_name_in_request: 'limit',
                limit: CAMPAIGNS_PAGE_LIMIT,
                response_path: 'campaigns'
            },
            retries: 3
        };

        for await (const page of nango.paginate<unknown>(proxyConfig)) {
            // A parse failure throws and aborts the run before trackDeletesEnd, so a malformed
            // response can never cause previously synced campaigns to be falsely marked deleted.
            const campaigns = z.array(LemlistCampaignSchema).parse(page);

            if (campaigns.length === 0) {
                continue;
            }

            await nango.batchSave(
                campaigns.map((campaign) => ({
                    id: campaign._id,
                    name: campaign.name,
                    status: campaign.status,
                    sequenceId: campaign.sequenceId,
                    ...(campaign.emoji !== undefined && { emoji: campaign.emoji }),
                    createdAt: campaign.createdAt,
                    createdBy: campaign.createdBy
                })),
                'Campaign'
            );

            offset += campaigns.length;
            await nango.saveCheckpoint({ offset });
        }

        await nango.clearCheckpoint();
        await nango.trackDeletesEnd('Campaign');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
