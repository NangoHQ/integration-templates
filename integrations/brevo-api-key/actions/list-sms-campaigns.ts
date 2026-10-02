import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const SmsCampaignStatusSchema = z.enum(['suspended', 'archive', 'sent', 'queued', 'draft', 'inProcess']);

const InputSchema = z
    .object({
        limit: z
            .number()
            .int()
            .min(1)
            .max(1000)
            .optional()
            .describe('Maximum number of SMS campaigns to return. The provider default is 500 and the maximum is 1000. Example: 100'),
        offset: z
            .number()
            .int()
            .min(0)
            .optional()
            .describe('Zero-based starting position in the list, used to page through results. Defaults to 0 when omitted. Example: 500'),
        status: SmsCampaignStatusSchema.optional().describe(
            'Filter campaigns by status. Allowed values: "suspended", "archive", "sent", "queued", "draft", "inProcess". Example: "sent"'
        ),
        sort: z
            .enum(['asc', 'desc'])
            .optional()
            .describe('Sort order by campaign creation date. Defaults to "desc" (newest first) when omitted. Example: "asc"')
    })
    .describe('Optional filters and pagination for listing SMS campaigns.');

const SmsCampaignSchema = z.object({
    id: z.number().describe('Unique numeric ID of the SMS campaign. Example: 12'),
    name: z.string().describe('Name of the SMS campaign.'),
    status: SmsCampaignStatusSchema.describe('Current status of the SMS campaign: "draft", "sent", "archive", "queued", "suspended" or "inProcess".'),
    content: z.string().describe('Text content of the SMS campaign message.'),
    sender: z.string().describe('Sender name or number displayed to recipients.'),
    createdAt: z.string().describe('UTC date-time when the campaign was created (YYYY-MM-DDTHH:mm:ss.SSSZ).'),
    modifiedAt: z.string().describe('UTC date-time when the campaign was last modified (YYYY-MM-DDTHH:mm:ss.SSSZ).'),
    scheduledAt: z.string().optional().describe('UTC date-time the campaign is scheduled for. Empty string when not scheduled.'),
    sentDate: z.string().optional().describe('UTC date-time the campaign was sent. Only present when the status is "sent".'),
    organisationPrefix: z.string().optional().describe('Brand-name prefix added before the message content. Empty string when not set.'),
    unsubscribeInstruction: z.string().optional().describe('Unsubscribe instructions appended to the message. Empty string when not set.'),
    recipients: z
        .object({
            lists: z.array(z.number()).describe('IDs of the contact lists the campaign targets.'),
            exclusionLists: z.array(z.number()).describe('IDs of the contact lists excluded from the campaign.'),
            segments: z.array(z.number()).optional().describe('IDs of the segments included in the campaign.'),
            excludedSegments: z.array(z.number()).optional().describe('IDs of the segments excluded from the campaign.')
        })
        .describe('Contact lists and segments the campaign targets or excludes.'),
    statistics: z
        .object({
            sent: z.number().describe('Number of SMS sent.'),
            delivered: z.number().describe('Number of SMS delivered.'),
            processing: z.number().describe('Number of SMS still being processed.'),
            hardBounces: z.number().describe('Number of hard-bounced SMS.'),
            softBounces: z.number().describe('Number of soft-bounced SMS.'),
            answered: z.number().describe('Number of replies received.'),
            unsubscriptions: z.number().describe('Number of unsubscriptions attributed to the campaign.')
        })
        .describe('Delivery and engagement statistics for the campaign.')
});

// Internal schema for the raw provider envelope. When the account has zero SMS
// campaigns the provider returns a bare {} with no keys at all, so both fields
// must be treated as optional here.
const ProviderListResponseSchema = z.object({
    campaigns: z.array(SmsCampaignSchema).optional(),
    count: z.number().optional()
});

const OutputSchema = z
    .object({
        campaigns: z.array(SmsCampaignSchema).describe('SMS campaigns matching the filters, sorted by creation date. Empty when the account has none.'),
        count: z.number().describe('Total number of SMS campaigns matching the filters across all pages. 0 when the account has none.')
    })
    .describe('List of SMS campaigns in the account with the total matching count.');

/**
 * @tags: [read]
 * @tagReason: Performs a single read-only GET request to list the account's SMS campaigns; nothing is created, updated, or deleted.
 */
const action = createAction({
    description: 'List SMS campaigns in the account, with optional status filtering, sorting and pagination.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://developers.brevo.com/reference/get-sms-campaigns
            endpoint: '/smsCampaigns',
            params: {
                ...(input.limit !== undefined && { limit: input.limit }),
                ...(input.offset !== undefined && { offset: input.offset }),
                ...(input.status !== undefined && { status: input.status }),
                ...(input.sort !== undefined && { sort: input.sort })
            },
            retries: 3
        };

        const response = await nango.get(config);

        const parsed = ProviderListResponseSchema.parse(response.data);

        return {
            campaigns: parsed.campaigns ?? [],
            count: parsed.count ?? 0
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
