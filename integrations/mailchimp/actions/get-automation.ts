import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    workflow_id: z.string().describe('The unique id for the Automation workflow. Example: "1a2b3c4d5e"')
});

const SegmentOptsSchema = z.object({
    saved_segment_id: z.number().optional(),
    match: z.string().optional(),
    conditions: z.array(z.unknown()).optional()
});

const RecipientsSchema = z.object({
    list_id: z.string().optional(),
    list_is_active: z.boolean().optional(),
    list_name: z.string().optional(),
    segment_opts: SegmentOptsSchema.optional(),
    store_id: z.string().optional()
});

const SettingsSchema = z.object({
    title: z.string().optional(),
    from_name: z.string().optional(),
    reply_to: z.string().optional(),
    use_conversation: z.boolean().optional(),
    to_name: z.string().optional(),
    authenticate: z.boolean().optional(),
    auto_footer: z.boolean().optional(),
    inline_css: z.boolean().optional()
});

const SalesforceTrackingSchema = z.object({
    campaign: z.boolean().optional(),
    notes: z.boolean().optional()
});

const CapsuleTrackingSchema = z.object({
    notes: z.boolean().optional()
});

const TrackingSchema = z.object({
    opens: z.boolean().optional(),
    html_clicks: z.boolean().optional(),
    text_clicks: z.boolean().optional(),
    goal_tracking: z.boolean().optional(),
    ecomm360: z.boolean().optional(),
    google_analytics: z.string().optional(),
    clicktale: z.string().optional(),
    salesforce: SalesforceTrackingSchema.optional(),
    capsule: CapsuleTrackingSchema.optional()
});

const RuntimeHoursSchema = z.object({
    type: z.string().optional()
});

const RuntimeSchema = z.object({
    days: z.array(z.string()).optional(),
    hours: RuntimeHoursSchema.optional()
});

const TriggerSettingsSchema = z.object({
    workflow_type: z.string().optional(),
    workflow_title: z.string().optional(),
    runtime: RuntimeSchema.optional(),
    workflow_emails_count: z.number().optional()
});

const ReportSummarySchema = z.object({
    opens: z.number().optional(),
    unique_opens: z.number().optional(),
    open_rate: z.number().optional(),
    clicks: z.number().optional(),
    subscriber_clicks: z.number().optional(),
    click_rate: z.number().optional()
});

const LinkSchema = z.object({
    rel: z.string().optional(),
    href: z.string().optional(),
    method: z.string().optional(),
    targetSchema: z.string().optional(),
    schema: z.string().optional()
});

const OutputSchema = z.object({
    id: z.string(),
    create_time: z.string().optional(),
    start_time: z.string().optional(),
    status: z.string().optional(),
    emails_sent: z.number().optional(),
    recipients: RecipientsSchema.optional(),
    settings: SettingsSchema.optional(),
    tracking: TrackingSchema.optional(),
    trigger_settings: TriggerSettingsSchema.optional(),
    report_summary: ReportSummarySchema.optional(),
    _links: z.array(LinkSchema).optional()
});

const action = createAction({
    description: 'Retrieve a single automation from Mailchimp.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/get-automation',
        group: 'Automations'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['automations:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://mailchimp.com/developer/marketing/api/automations/get-automation-info/
            endpoint: `/3.0/automations/${encodeURIComponent(input.workflow_id)}`,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Automation not found',
                workflow_id: input.workflow_id
            });
        }

        const automation = OutputSchema.parse(response.data);
        return automation;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
