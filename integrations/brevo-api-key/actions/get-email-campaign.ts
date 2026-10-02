import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const InputSchema = z
    .object({
        campaignId: z.number().int().positive().describe('ID of the email campaign to retrieve. Example: 1'),
        statistics: z
            .enum(['globalStats', 'linksStats', 'statsByDomain', 'statsByDevice', 'statsByBrowser'])
            .optional()
            .describe('Optional filter to return only the selected statistics section of the campaign. Omit to return all statistics.'),
        excludeHtmlContent: z.boolean().optional().describe('When true, the htmlContent field is returned as an empty string. Defaults to false.')
    })
    .describe('Input for retrieving a single Brevo email campaign');

const CampaignStatsSchema = z.object({
    sent: z.number().nullish().describe('Number of emails sent for the campaign'),
    delivered: z.number().nullish().describe('Number of emails successfully delivered'),
    hardBounces: z.number().nullish().describe('Number of hard bounces for the campaign'),
    softBounces: z.number().nullish().describe('Number of soft bounces for the campaign'),
    complaints: z.number().nullish().describe('Number of complaints (spam reports) for the campaign'),
    unsubscriptions: z.number().nullish().describe('Number of unsubscriptions for the campaign'),
    viewed: z.number().nullish().describe('Total number of times the campaign email was opened'),
    uniqueViews: z.number().nullish().describe('Number of unique recipients who opened the campaign email'),
    clickers: z.number().nullish().describe('Total number of clicks for the campaign'),
    uniqueClicks: z.number().nullish().describe('Number of unique clicks for the campaign'),
    trackableViews: z.number().nullish().describe('Recipients without any privacy protection option enabled in their email client'),
    trackableViewsRate: z.number().nullish().describe('Rate of recipients without any privacy protection option enabled in their email client'),
    opensRate: z.number().nullish().describe('Percentage of recipients who opened the email, possibly including Apple MPP opens'),
    appleMppOpens: z.number().nullish().describe('Number of times the email was opened automatically through Apple Mail Privacy Protection'),
    deferred: z.number().nullish().describe('Number of emails whose delivery was deferred'),
    estimatedViews: z.number().nullish().describe('Estimated number of views, applied to all delivered emails'),
    listId: z.number().nullish().describe('ID of the contact list these per-list statistics belong to'),
    returnBounce: z.number().nullish().describe('Total number of non-delivered emails for the campaign')
});

const DeviceBrowserStatsSchema = z.object({
    clickers: z.number().nullish().describe('Total clicks for the campaign from this browser or device'),
    uniqueClicks: z.number().nullish().describe('Unique clicks for the campaign from this browser or device'),
    uniqueViews: z.number().nullish().describe('Unique opens for the campaign from this browser or device'),
    viewed: z.number().nullish().describe('Total opens for the campaign from this browser or device')
});

const SenderSchema = z.object({
    email: z.string().optional().describe('Sender email address of the campaign'),
    id: z.number().optional().describe('Sender ID of the campaign'),
    name: z.string().optional().describe('Sender name of the campaign')
});

const RecipientsSchema = z.object({
    lists: z.array(z.number()).describe('IDs of the contact lists targeted by the campaign'),
    exclusionLists: z.array(z.number()).describe('IDs of the contact lists excluded from the campaign'),
    segments: z.array(z.number()).optional().describe('IDs of the segments included in the campaign'),
    excludedSegments: z.array(z.number()).optional().describe('IDs of the segments excluded from the campaign')
});

const StatisticsSchema = z.object({
    campaignStats: z.array(CampaignStatsSchema).describe('List-wise delivery statistics of the campaign'),
    globalStats: CampaignStatsSchema.describe('Overall delivery statistics of the campaign'),
    linksStats: z
        .record(z.string(), z.union([z.number(), z.object({ nbClick: z.number() })]))
        .describe('Click statistics keyed by link URL; each value is either a click count or an object with an nbClick count'),
    mirrorClick: z.number().describe('Number of clicks on the mirror link'),
    remaining: z.number().describe('Number of remaining emails to send'),
    statsByDomain: z.record(z.string(), CampaignStatsSchema).optional().describe('Delivery statistics grouped by recipient email domain'),
    statsByDevice: z
        .object({
            desktop: z.record(z.string(), DeviceBrowserStatsSchema).optional().describe('Statistics for desktop devices, keyed by device name'),
            mobile: z.record(z.string(), DeviceBrowserStatsSchema).optional().describe('Statistics for mobile devices, keyed by device name'),
            tablet: z.record(z.string(), DeviceBrowserStatsSchema).optional().describe('Statistics for tablet devices, keyed by device name'),
            unknown: z.record(z.string(), DeviceBrowserStatsSchema).optional().describe('Statistics for unidentified devices, keyed by device name')
        })
        .optional()
        .describe('Delivery statistics grouped by device type'),
    statsByBrowser: z.record(z.string(), DeviceBrowserStatsSchema).optional().describe('Delivery statistics grouped by browser')
});

const EmailExpirationDateSchema = z.object({
    duration: z.number().optional().describe('Duration of the email expiry'),
    unit: z.enum(['days', 'weeks', 'months']).optional().describe('Unit of the email expiry duration')
});

const OutputSchema = z
    .object({
        id: z.number().describe('ID of the campaign'),
        name: z.string().describe('Name of the campaign'),
        status: z
            .enum(['draft', 'sent', 'archive', 'queued', 'suspended', 'in_process', 'in_review', 'cancelling', 'cancelled'])
            .describe('Status of the campaign'),
        type: z.enum(['classic', 'trigger']).describe('Type of the campaign'),
        subject: z.string().optional().describe('Subject of the campaign. Present when A/B testing is disabled'),
        previewText: z.string().optional().describe('Preview text (preheader) of the campaign email'),
        createdAt: z.string().describe('Creation UTC date-time of the campaign (YYYY-MM-DDTHH:mm:ss.SSSZ)'),
        modifiedAt: z.string().describe('UTC date-time of the last modification of the campaign (YYYY-MM-DDTHH:mm:ss.SSSZ)'),
        scheduledAt: z.string().optional().describe('UTC date-time the campaign is scheduled for. Present only when the campaign is scheduled'),
        sentDate: z.string().optional().describe('UTC date-time the campaign was sent. Present only when the campaign status is sent'),
        htmlContent: z.string().describe('HTML content of the campaign email. Empty string when excludeHtmlContent is true'),
        header: z.string().describe('Header of the campaign email'),
        footer: z.string().describe('Footer of the campaign email'),
        replyTo: z.string().describe('Reply-to email address of the campaign'),
        toField: z.string().optional().describe('Customization of the "To" field of the campaign email'),
        sender: SenderSchema.describe('Sender of the campaign'),
        testSent: z.boolean().describe('Whether a test email has been sent for the campaign'),
        recipients: RecipientsSchema.describe('Contact lists and segments targeted or excluded by the campaign'),
        statistics: StatisticsSchema.describe('Delivery and engagement statistics of the campaign'),
        attachmentFile: z.string().optional().describe('URL of the attachment file. Present only when the campaign has an attachment'),
        attachmentUrl: z.string().optional().describe('URL of the attachment file associated with the campaign. Empty string when there is no attachment'),
        abTesting: z.boolean().optional().describe('Whether A/B testing is enabled for the campaign'),
        splitRule: z.number().optional().describe('Size of the A/B test groups. Present only when A/B testing is enabled'),
        subjectA: z.string().optional().describe('Subject A of the A/B test campaign'),
        subjectB: z.string().optional().describe('Subject B of the A/B test campaign'),
        winnerCriteria: z.string().optional().describe('Criteria for the winning version of the A/B test'),
        winnerDelay: z.number().optional().describe('Duration in hours after which the winning version of the A/B test is sent'),
        sendAtBestTime: z.boolean().optional().describe("Whether the campaign is sent at each recipient's best time"),
        emailExpirationDate: EmailExpirationDateSchema.optional().describe('Expiration date configuration of the campaign email, when set'),
        inlineImageActivation: z.boolean().optional().describe('Whether images can be embedded inline in the campaign email'),
        mirrorActive: z.boolean().optional().describe('Whether mirror links are activated in the campaign'),
        recurring: z.boolean().optional().describe('For trigger campaigns, whether a contact can receive the same campaign several times'),
        returnBounce: z.number().optional().describe('Total number of non-delivered emails for the campaign'),
        shareLink: z.string().optional().describe('Link to share the campaign on social media, or a descriptive message when no link is available'),
        tag: z.string().optional().describe('Tag of the campaign'),
        tags: z.array(z.string()).optional().describe('Tags of the campaign'),
        utmCampaignValue: z.string().optional().describe('utm_campaign value associated with the campaign'),
        utmContent: z.string().optional().describe('utm_content value associated with the campaign'),
        utmID: z.number().optional().describe('Campaign ID used as the utm_id parameter'),
        utmMedium: z.string().optional().describe('utm_medium value associated with the campaign'),
        utmSource: z.string().optional().describe('utm_source value associated with the campaign'),
        utmTerm: z.string().optional().describe('utm_term value associated with the campaign')
    })
    .describe('Full detail of a Brevo email campaign, including recipients, content and delivery statistics');

/**
 * @tags: [read]
 * @tagReason: Performs a single read-only GET of an existing email campaign and creates, updates, or deletes nothing in Brevo.
 * @pitfalls: Delivery statistics are zeroed out until the campaign has actually been sent, so draft or scheduled campaigns return zeroed counters rather than real engagement data. Several optional fields (e.g. previewText, toField, tag, attachmentUrl) come back as empty strings instead of being omitted, so check for empty strings rather than undefined.
 */
const action = createAction({
    description: "Retrieve a single email campaign's full detail, including delivery statistics",
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developers.brevo.com/reference/getemailcampaign
        const config: ProxyConfiguration = {
            // https://developers.brevo.com/reference/getemailcampaign
            endpoint: `/emailCampaigns/${input.campaignId}`,
            params: {
                ...(input.statistics !== undefined && { statistics: input.statistics }),
                ...(input.excludeHtmlContent !== undefined && { excludeHtmlContent: input.excludeHtmlContent ? 'true' : 'false' })
            },
            retries: 3
        };
        const response = await nango.get(config);

        return OutputSchema.parse(response.data);
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
