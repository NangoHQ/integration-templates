import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('Campaign ID. Example: "1"')
});

const CampaignSchema = z.object({
    type: z.string().optional(),
    userid: z.string().optional(),
    segmentid: z.string().optional(),
    bounceid: z.string().optional(),
    realcid: z.string().optional(),
    sendid: z.string().optional(),
    threadid: z.string().optional(),
    seriesid: z.string().optional(),
    formid: z.string().optional(),
    basetemplateid: z.string().optional(),
    basemessageid: z.string().optional(),
    addressid: z.string().optional(),
    source: z.string().optional(),
    name: z.string().optional(),
    cdate: z.string().optional(),
    mdate: z.string().optional(),
    sdate: z.string().nullable().optional(),
    ldate: z.string().nullable().optional(),
    send_amt: z.string().optional(),
    total_amt: z.string().optional(),
    opens: z.string().optional(),
    uniqueopens: z.string().optional(),
    linkclicks: z.string().optional(),
    uniquelinkclicks: z.string().optional(),
    subscriberclicks: z.string().optional(),
    forwards: z.string().optional(),
    uniqueforwards: z.string().optional(),
    hardbounces: z.string().optional(),
    softbounces: z.string().optional(),
    unsubscribes: z.string().optional(),
    unsubreasons: z.string().optional(),
    updates: z.string().optional(),
    socialshares: z.string().optional(),
    replies: z.string().optional(),
    uniquereplies: z.string().optional(),
    status: z.string().optional(),
    public: z.string().optional(),
    mail_transfer: z.string().optional(),
    mail_send: z.string().optional(),
    mail_cleanup: z.string().optional(),
    mailer_log_file: z.string().optional(),
    tracklinks: z.string().optional(),
    tracklinksanalytics: z.string().optional(),
    trackreads: z.string().optional(),
    trackreadsanalytics: z.string().optional(),
    analytics_campaign_name: z.string().optional(),
    tweet: z.string().optional(),
    facebook: z.string().optional(),
    survey: z.string().optional(),
    embed_images: z.string().optional(),
    htmlunsub: z.string().optional(),
    textunsub: z.string().optional(),
    htmlunsubdata: z.string().nullable().optional(),
    textunsubdata: z.string().nullable().optional(),
    recurring: z.string().optional(),
    willrecur: z.string().optional(),
    split_type: z.string().optional(),
    split_content: z.string().optional(),
    split_offset: z.string().optional(),
    split_offset_type: z.string().optional(),
    split_winner_messageid: z.string().optional(),
    split_winner_awaiting: z.string().optional(),
    responder_offset: z.string().optional(),
    responder_type: z.string().optional(),
    responder_existing: z.string().optional(),
    reminder_field: z.string().optional(),
    reminder_format: z.string().nullable().optional(),
    reminder_type: z.string().optional(),
    reminder_offset: z.string().optional(),
    reminder_offset_type: z.string().optional(),
    reminder_offset_sign: z.string().optional(),
    reminder_last_cron_run: z.string().nullable().optional(),
    activerss_interval: z.string().optional(),
    activerss_url: z.string().nullable().optional(),
    activerss_items: z.string().optional(),
    ip4: z.string().optional(),
    laststep: z.string().optional(),
    managetext: z.string().optional(),
    schedule: z.string().optional(),
    scheduleddate: z.string().nullable().optional(),
    waitpreview: z.string().optional(),
    deletestamp: z.string().nullable().optional(),
    replysys: z.string().optional(),
    created_timestamp: z.string().optional(),
    updated_timestamp: z.string().optional(),
    created_by: z.string().nullable().optional(),
    updated_by: z.string().nullable().optional(),
    ip: z.string().optional(),
    series_send_lock_time: z.string().nullable().optional(),
    can_skip_approval: z.string().optional(),
    use_quartz_scheduler: z.string().optional(),
    verified_opens: z.string().optional(),
    verified_unique_opens: z.string().optional(),
    segmentname: z.string().optional(),
    has_predictive_content: z.string().optional(),
    message_id: z.string().optional(),
    screenshot: z.string().optional(),
    campaign_message_id: z.string().optional(),
    ed_version: z.string().optional(),
    links: z
        .object({
            user: z.string().optional(),
            automation: z.string().optional(),
            campaignMessage: z.string().optional(),
            campaignMessages: z.string().optional(),
            links: z.string().optional(),
            aggregateRevenues: z.string().optional(),
            segment: z.string().optional(),
            campaignLists: z.string().optional()
        })
        .optional(),
    id: z.string().optional(),
    user: z.string().optional(),
    automation: z.unknown().nullable().optional()
});

const OutputSchema = z.object({
    campaign: CampaignSchema
});

const action = createAction({
    description: 'Retrieve a single campaign from ActiveCampaign.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/get-campaign',
        group: 'Campaigns'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://developers.activecampaign.com/reference/retrieve-a-campaign
            endpoint: `/3/campaigns/${encodeURIComponent(input.id)}`,
            retries: 3
        });

        const isObject = (value: unknown): value is Record<string, unknown> => {
            return typeof value === 'object' && value !== null;
        };

        if (!isObject(response.data) || !('campaign' in response.data)) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Campaign not found',
                id: input.id
            });
        }

        const providerCampaign = CampaignSchema.parse(response.data['campaign']);

        return {
            campaign: providerCampaign
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
