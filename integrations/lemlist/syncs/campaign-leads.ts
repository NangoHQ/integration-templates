import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const CAMPAIGNS_PAGE_LIMIT = 100;
const CAMPAIGN_LEADS_LIMIT = 500;

const CampaignLeadSchema = z
    .object({
        id: z
            .string()
            .describe(
                'Stable record id scoped to the parent campaign, formatted as `${campaignId}:${leadId}`. The lemlist lead id is only unique within its campaign, so the campaign id is prepended to avoid collisions across campaigns.'
            ),
        campaignId: z.string().describe('Identifier of the campaign this lead enrollment belongs to. Example: cam_vyzp8v33RBTfNQRvz'),
        leadId: z.string().describe('Campaign-scoped lemlist lead identifier (the `_id` field of the campaign leads list). Example: lea_K38DYz3t7pyzATMZF'),
        contactId: z
            .string()
            .describe(
                'Account-wide contact identifier. Unlike leadId, this is stable across campaigns for the same person and can be used to join with other lemlist contacts. Example: ctc_jgZq5fmsGxkmSd7x4'
            ),
        state: z
            .string()
            .describe(
                'Last reported state of the lead within this campaign, e.g. scanned, contacted, interested. Note: lemlist does not update this value when a lead is later removed or unsubscribed, so it reflects the state at the last reported activity rather than live membership.'
            )
    })
    .describe('A lead enrolled in a lemlist campaign, as listed by the campaign leads endpoint.');

const CheckpointSchema = z.object({
    nextCampaignOffset: z
        .number()
        .int()
        .nonnegative()
        .describe('Zero-based campaign offset to resume from during an in-progress full refresh of all campaign lead lists.')
});

const CampaignResponseSchema = z.object({
    _id: z.string()
});

const CampaignLeadResponseSchema = z.object({
    _id: z.string(),
    contactId: z.string(),
    state: z.string()
});

const sync = createSync({
    description: 'Sync every lead enrolled in every campaign',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        CampaignLead: CampaignLeadSchema
    },

    exec: async (nango) => {
        const checkpoint = (await nango.getCheckpoint()) as z.infer<typeof CheckpointSchema> | null;
        let nextCampaignOffset = checkpoint?.nextCampaignOffset ?? 0;

        // Full refresh with delete detection: GET /api/campaigns/{campaignId}/leads
        // returns only {_id, contactId, state} with no timestamp and no
        // changed-since filter, so every run walks every campaign and relies on
        // trackDeletesStart/trackDeletesEnd to drop records whose leads disappeared
        // from a campaign's list. The campaigns list supports offset pagination, so
        // the sync can resume at the next campaign after an interruption.
        await nango.trackDeletesStart('CampaignLead');

        const campaignsConfig: ProxyConfiguration = {
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
                offset_start_value: nextCampaignOffset,
                offset_calculation_method: 'by-response-size',
                limit_name_in_request: 'limit',
                limit: CAMPAIGNS_PAGE_LIMIT,
                response_path: 'campaigns'
            },
            retries: 3
        };

        for await (const page of nango.paginate<unknown>(campaignsConfig)) {
            const campaigns = z.array(CampaignResponseSchema).parse(page);
            for (const campaign of campaigns) {
                const campaignId = campaign._id;
                const leadsConfig: ProxyConfiguration = {
                    // https://developer.lemlist.com/api-reference/endpoints/leads/get-campaign-leads
                    endpoint: `/api/campaigns/${encodeURIComponent(campaignId)}/leads`,
                    params: {
                        limit: CAMPAIGN_LEADS_LIMIT
                    },
                    retries: 3
                };

                const response = await nango.get(leadsConfig);
                // Throw on parse failure: silently skipping a malformed record inside a
                // delete-tracked scan would falsely mark it as deleted.
                const leads = z.array(CampaignLeadResponseSchema).parse(response.data);

                const records = leads.map((lead) => ({
                    id: `${campaignId}:${lead._id}`,
                    campaignId: campaignId,
                    leadId: lead._id,
                    contactId: lead.contactId,
                    state: lead.state
                }));

                if (records.length > 0) {
                    await nango.batchSave(records, 'CampaignLead');
                }

                nextCampaignOffset += 1;
                await nango.saveCheckpoint({ nextCampaignOffset });
            }
        }

        await nango.clearCheckpoint();
        await nango.trackDeletesEnd('CampaignLead');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
