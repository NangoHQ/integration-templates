import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const ISO_DATE_TIME_REGEX = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:?\d{2})$/;

const InputSchema = z
    .object({
        limit: z.number().int().min(1).optional().describe('Maximum number of campaigns to return per page. Defaults to 50 when omitted. Example: 10'),
        offset: z
            .number()
            .int()
            .min(0)
            .optional()
            .describe('Zero-based index of the first campaign to return. Combine with limit to page through results. Defaults to 0. Example: 0'),
        type: z
            .enum(['classic', 'trigger'])
            .optional()
            .describe('Filter campaigns by type. Classic campaigns are one-off sends; trigger campaigns are recurring automated sends.'),
        status: z
            .enum(['suspended', 'archive', 'sent', 'queued', 'draft', 'inProcess', 'inReview', 'cancelling', 'cancelled'])
            .optional()
            .describe('Filter campaigns by status.'),
        sort: z.enum(['asc', 'desc']).optional().describe('Sort order by campaign creation date. Defaults to "desc" (newest first) when omitted.'),
        startDate: z
            .string()
            .regex(ISO_DATE_TIME_REGEX)
            .optional()
            .describe(
                'Only include campaigns sent on or after this date-time. Must be a full ISO 8601 date-time such as "2026-09-01T00:00:00.000Z" (plain dates are rejected). Must be used together with endDate, must not be in the future, and only applies when status is omitted or "sent".'
            ),
        endDate: z
            .string()
            .regex(ISO_DATE_TIME_REGEX)
            .optional()
            .describe(
                'Only include campaigns sent on or before this date-time. Must be a full ISO 8601 date-time such as "2026-10-01T00:00:00.000Z" (plain dates are rejected). Must be used together with startDate, must not be in the future, and the range between startDate and endDate may not exceed 2 years.'
            )
    })
    .describe('Optional filters and pagination for listing email campaigns.');

const SenderSchema = z
    .object({
        id: z.number().optional().describe('ID of the sender used for the campaign. Example: 1'),
        name: z.string().optional().describe('Display name of the campaign sender. Example: "Marketing Team"'),
        email: z.string().optional().describe('Email address of the campaign sender. Example: "marketing@example.com"')
    })
    .describe('Sender identity of the campaign.');

const RecipientsSchema = z
    .object({
        lists: z.array(z.number()).describe('IDs of the contact lists the campaign is sent to. Example: [2]'),
        exclusionLists: z.array(z.number()).describe('IDs of the contact lists excluded from the campaign recipients. Example: []'),
        segments: z.array(z.number()).optional().describe('IDs of the segments included in the campaign recipients, when segments are used. Example: []')
    })
    .describe('Recipient targeting of the campaign.');

const CampaignSchema = z
    .object({
        id: z.number().describe('Unique ID of the campaign. Example: 42'),
        name: z.string().describe('Name of the campaign. Example: "October Newsletter"'),
        status: z.string().describe('Current status of the campaign. Example: "sent"'),
        type: z.string().describe('Type of the campaign. Example: "classic"'),
        subject: z.string().optional().describe('Subject line of the campaign email. Omitted for A/B test campaigns. Example: "Our October news"'),
        previewText: z.string().optional().describe('Preview (preheader) text of the campaign email. Example: "See what is new this month"'),
        tag: z.string().optional().describe('Tag attached to the campaign. Example: "newsletter"'),
        testSent: z.boolean().optional().describe('Whether a test email has been sent for this campaign.'),
        sentDate: z
            .string()
            .optional()
            .describe('UTC date-time when the campaign was sent. Only present for sent campaigns. Example: "2026-10-01T17:22:41.000Z"'),
        scheduledAt: z.string().optional().describe('UTC date-time on which the campaign is scheduled to be sent. Example: "2026-12-31T09:00:00.000Z"'),
        shareLink: z.string().optional().describe('Public link to share the campaign. Example: "https://sh1.sendinblue.com/example.html"'),
        createdAt: z.string().describe('UTC date-time when the campaign was created. Example: "2026-09-15T10:00:00.000Z"'),
        modifiedAt: z.string().describe('UTC date-time when the campaign was last modified. Example: "2026-09-16T11:00:00.000Z"'),
        sender: SenderSchema.optional(),
        recipients: RecipientsSchema.optional()
    })
    .describe('A single email campaign.');

const OutputSchema = z
    .object({
        campaigns: z.array(CampaignSchema).describe('Email campaigns matching the given filters.'),
        count: z.number().describe('Total number of campaigns matching the filters across all pages. Example: 27'),
        nextOffset: z
            .number()
            .optional()
            .describe('Offset value to pass as input.offset to fetch the next page of campaigns. Omitted when no further campaigns remain. Example: 10')
    })
    .describe('A page of email campaigns with the total matching count.');

const BrevoCampaignSchema = z.object({
    id: z.number(),
    name: z.string(),
    status: z.string(),
    type: z.string(),
    subject: z.string().optional(),
    previewText: z.string().optional(),
    tag: z.string().optional(),
    testSent: z.boolean().optional(),
    sentDate: z.string().optional(),
    scheduledAt: z.string().optional(),
    shareLink: z.string().optional(),
    createdAt: z.string(),
    modifiedAt: z.string(),
    sender: z
        .object({
            id: z.number().optional(),
            name: z.string().optional(),
            email: z.string().optional()
        })
        .optional(),
    recipients: z
        .object({
            lists: z.array(z.number()),
            exclusionLists: z.array(z.number()),
            segments: z.array(z.number()).optional()
        })
        .optional()
});

const BrevoListCampaignsResponseSchema = z.object({
    campaigns: z.array(BrevoCampaignSchema).optional(),
    count: z.number().optional()
});

/**
 * @tags: [read]
 * @tagReason: Only fetches email campaigns via a provider GET request; nothing is created, modified, or deleted.
 * @pitfalls: startDate/endDate must both be full ISO 8601 date-times (plain dates are rejected with a 400), neither may be in the future, the range may not exceed 2 years, and they only apply when status is omitted or "sent". The status filter accepts camelCase values (inProcess, inReview) while returned campaign statuses use snake_case (in_process, in_review).
 */
const action = createAction({
    description: 'List email (classic) campaigns in the account.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://developers.brevo.com/reference/get-email-campaigns
            endpoint: '/emailCampaigns',
            params: {
                ...(input.limit !== undefined && { limit: input.limit }),
                ...(input.offset !== undefined && { offset: input.offset }),
                ...(input.type !== undefined && { type: input.type }),
                ...(input.status !== undefined && { status: input.status }),
                ...(input.sort !== undefined && { sort: input.sort }),
                ...(input.startDate !== undefined && { startDate: input.startDate }),
                ...(input.endDate !== undefined && { endDate: input.endDate })
            },
            retries: 3
        };

        const response = await nango.get(config);
        const parsed = BrevoListCampaignsResponseSchema.parse(response.data);

        const campaigns = parsed.campaigns ?? [];
        const count = parsed.count ?? campaigns.length;
        const offset = input.offset ?? 0;
        const nextOffset = offset + campaigns.length < count ? offset + campaigns.length : undefined;

        return {
            campaigns: campaigns.map((campaign) => {
                return {
                    id: campaign.id,
                    name: campaign.name,
                    status: campaign.status,
                    type: campaign.type,
                    ...(campaign.subject !== undefined && { subject: campaign.subject }),
                    ...(campaign.previewText !== undefined && { previewText: campaign.previewText }),
                    ...(campaign.tag !== undefined && { tag: campaign.tag }),
                    ...(campaign.testSent !== undefined && { testSent: campaign.testSent }),
                    ...(campaign.sentDate !== undefined && { sentDate: campaign.sentDate }),
                    ...(campaign.scheduledAt !== undefined && { scheduledAt: campaign.scheduledAt }),
                    ...(campaign.shareLink !== undefined && { shareLink: campaign.shareLink }),
                    createdAt: campaign.createdAt,
                    modifiedAt: campaign.modifiedAt,
                    ...(campaign.sender !== undefined && { sender: campaign.sender }),
                    ...(campaign.recipients !== undefined && { recipients: campaign.recipients })
                };
            }),
            count,
            ...(nextOffset !== undefined && { nextOffset })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
