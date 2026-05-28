import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const CampaignSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    type: z.string().optional(),
    status: z.string().optional(),
    cdate: z.string().optional(),
    mdate: z.string().optional(),
    sdate: z.string().optional(),
    ldate: z.string().optional(),
    user_id: z.string().optional(),
    series_id: z.string().optional(),
    send_amt: z.string().optional(),
    total_amt: z.string().optional(),
    opens: z.string().optional(),
    uniqueopens: z.string().optional(),
    linkclicks: z.string().optional(),
    uniquelinkclicks: z.string().optional(),
    forwards: z.string().optional(),
    uniqueforwards: z.string().optional(),
    hardbounces: z.string().optional(),
    softbounces: z.string().optional(),
    unsubscribes: z.string().optional(),
    replies: z.string().optional(),
    tracklinks: z.string().optional(),
    trackreads: z.string().optional(),
    public: z.string().optional(),
    source: z.string().optional()
});

const ProviderCampaignSchema = z.object({
    id: z.string(),
    name: z.string().nullable().optional(),
    type: z.string().nullable().optional(),
    status: z.string().nullable().optional(),
    cdate: z.string().nullable().optional(),
    mdate: z.string().nullable().optional(),
    sdate: z.string().nullable().optional(),
    ldate: z.string().nullable().optional(),
    userid: z.string().nullable().optional(),
    seriesid: z.string().nullable().optional(),
    send_amt: z.string().nullable().optional(),
    total_amt: z.string().nullable().optional(),
    opens: z.string().nullable().optional(),
    uniqueopens: z.string().nullable().optional(),
    linkclicks: z.string().nullable().optional(),
    uniquelinkclicks: z.string().nullable().optional(),
    forwards: z.string().nullable().optional(),
    uniqueforwards: z.string().nullable().optional(),
    hardbounces: z.string().nullable().optional(),
    softbounces: z.string().nullable().optional(),
    unsubscribes: z.string().nullable().optional(),
    replies: z.string().nullable().optional(),
    tracklinks: z.string().nullable().optional(),
    trackreads: z.string().nullable().optional(),
    public: z.string().nullable().optional(),
    source: z.string().nullable().optional()
});

const sync = createSync({
    description: 'Sync campaigns from ActiveCampaign.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    models: {
        Campaign: CampaignSchema
    },
    endpoints: [
        {
            method: 'GET',
            path: '/syncs/campaigns'
        }
    ],

    exec: async (nango) => {
        // Blocker: provider only exposes GET /3/campaigns with no changed-since filter,
        // no deleted-record endpoint, and no resumable cursor. Pagination is limit/offset only.
        await nango.trackDeletesStart('Campaign');

        const proxyConfig: ProxyConfiguration = {
            // https://developers.activecampaign.com/reference/list-all-campaigns
            endpoint: '/3/campaigns',
            paginate: {
                type: 'offset',
                offset_name_in_request: 'offset',
                offset_calculation_method: 'by-response-size',
                limit_name_in_request: 'limit',
                limit: 100,
                response_path: 'campaigns'
            },
            retries: 3
        };

        for await (const page of nango.paginate(proxyConfig)) {
            const campaigns = [];
            for (const item of page) {
                const parsed = ProviderCampaignSchema.safeParse(item);
                if (!parsed.success) {
                    throw new Error(`Failed to parse campaign: ${parsed.error.message}`);
                }
                const record = parsed.data;
                campaigns.push({
                    id: record.id,
                    ...(record.name != null && { name: record.name }),
                    ...(record.type != null && { type: record.type }),
                    ...(record.status != null && { status: record.status }),
                    ...(record.cdate != null && { cdate: record.cdate }),
                    ...(record.mdate != null && { mdate: record.mdate }),
                    ...(record.sdate != null && { sdate: record.sdate }),
                    ...(record.ldate != null && { ldate: record.ldate }),
                    ...(record.userid != null && { user_id: record.userid }),
                    ...(record.seriesid != null && { series_id: record.seriesid }),
                    ...(record.send_amt != null && { send_amt: record.send_amt }),
                    ...(record.total_amt != null && { total_amt: record.total_amt }),
                    ...(record.opens != null && { opens: record.opens }),
                    ...(record.uniqueopens != null && { uniqueopens: record.uniqueopens }),
                    ...(record.linkclicks != null && { linkclicks: record.linkclicks }),
                    ...(record.uniquelinkclicks != null && { uniquelinkclicks: record.uniquelinkclicks }),
                    ...(record.forwards != null && { forwards: record.forwards }),
                    ...(record.uniqueforwards != null && { uniqueforwards: record.uniqueforwards }),
                    ...(record.hardbounces != null && { hardbounces: record.hardbounces }),
                    ...(record.softbounces != null && { softbounces: record.softbounces }),
                    ...(record.unsubscribes != null && { unsubscribes: record.unsubscribes }),
                    ...(record.replies != null && { replies: record.replies }),
                    ...(record.tracklinks != null && { tracklinks: record.tracklinks }),
                    ...(record.trackreads != null && { trackreads: record.trackreads }),
                    ...(record.public != null && { public: record.public }),
                    ...(record.source != null && { source: record.source })
                });
            }

            if (campaigns.length > 0) {
                await nango.batchSave(campaigns, 'Campaign');
            }
        }

        await nango.trackDeletesEnd('Campaign');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
