import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const InputSchema = z
    .object({
        limit: z
            .number()
            .int()
            .min(1)
            .max(100)
            .optional()
            .describe('Number of campaigns to retrieve per page. Defaults to 100 when omitted. Maximum: 100. Example: 25.'),
        cursor: z
            .string()
            .regex(/^[1-9]\d*$/)
            .optional()
            .describe('Page cursor returned as nextCursor by a previous call. Omit to fetch the first page. Example: "2".')
    })
    .describe('Pagination options for listing lemlist campaigns.');

const CampaignSchema = z
    .object({
        id: z.string().describe('Unique campaign identifier. Pass this ID to campaign-scoped lead actions. Example: "cam_4HrZbi8xsez4QlrnL".'),
        name: z.string().describe('Campaign name. Example: "Product Launch Campaign".'),
        status: z.string().describe('Campaign status. One of: running, paused, draft, ended, archived, errors.'),
        emoji: z.string().optional().describe('Emoji shown next to the campaign name. Omitted when the campaign has none.'),
        labels: z.array(z.string()).optional().describe('Categorization labels attached to the campaign.'),
        createdAt: z.string().optional().describe('Creation timestamp in ISO 8601 format. Example: "2025-02-20T14:45:54.230Z".'),
        createdBy: z.string().optional().describe('ID of the user who created the campaign. Example: "usr_zdTCrNFyXblc4mrYK".'),
        timezone: z.string().optional().describe('IANA timezone the campaign schedule runs in. Example: "Europe/Paris".'),
        sequenceId: z.string().optional().describe('ID of the campaign main sequence. Example: "seq_8Xp3uSRQrBAdTGffc".'),
        scheduleIds: z.array(z.string()).optional().describe('IDs of the schedules associated with the campaign.'),
        hasError: z.boolean().optional().describe('Whether the campaign currently has configuration errors.'),
        errors: z.array(z.string()).optional().describe('Human-readable error messages when the campaign has configuration errors.')
    })
    .describe('A lemlist campaign.');

const OutputSchema = z
    .object({
        campaigns: z.array(CampaignSchema).describe('Campaigns of the lemlist team for the requested page.'),
        nextCursor: z.string().optional().describe('Cursor to pass as cursor to fetch the next page. Omitted when there are no more pages.')
    })
    .describe('A page of lemlist campaigns.');

const ProviderCampaignSchema = z.object({
    _id: z.string(),
    name: z.string(),
    status: z.string(),
    emoji: z.string().nullish(),
    labels: z.array(z.string()).nullish(),
    createdAt: z.string().nullish(),
    createdBy: z.string().nullish(),
    timezone: z.string().nullish(),
    sequenceId: z.string().nullish(),
    scheduleIds: z.array(z.string()).nullish(),
    hasError: z.boolean().nullish(),
    errors: z.array(z.string()).nullish()
});

const ProviderResponseSchema = z.object({
    campaigns: z.array(ProviderCampaignSchema),
    pagination: z
        .object({
            totalRecords: z.number(),
            currentPage: z.number(),
            nextPage: z.number(),
            totalPage: z.number()
        })
        .nullish()
});

/**
 * @tags: [read]
 * @tagReason: Reads the team campaign list with a single GET request; it never modifies provider data.
 */
const action = createAction({
    description: 'List campaigns in the lemlist team, to discover campaign IDs for lead actions.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://developer.lemlist.com/api-reference/endpoints/campaigns/get-many-campaigns
            endpoint: '/api/campaigns',
            params: {
                version: 'v2',
                limit: input.limit ?? 100,
                page: input.cursor ? Number(input.cursor) : 1
            },
            retries: 3
        };

        const response = await nango.get(config);

        const parsed = ProviderResponseSchema.parse(response.data);

        const campaigns = parsed.campaigns.map((campaign) => ({
            id: campaign._id,
            name: campaign.name,
            status: campaign.status,
            ...(campaign.emoji != null && { emoji: campaign.emoji }),
            ...(campaign.labels != null && { labels: campaign.labels }),
            ...(campaign.createdAt != null && { createdAt: campaign.createdAt }),
            ...(campaign.createdBy != null && { createdBy: campaign.createdBy }),
            ...(campaign.timezone != null && { timezone: campaign.timezone }),
            ...(campaign.sequenceId != null && { sequenceId: campaign.sequenceId }),
            ...(campaign.scheduleIds != null && { scheduleIds: campaign.scheduleIds }),
            ...(campaign.hasError != null && { hasError: campaign.hasError }),
            ...(campaign.errors != null && { errors: campaign.errors })
        }));

        const nextCursor =
            parsed.pagination && parsed.pagination.currentPage < parsed.pagination.totalPage ? String(parsed.pagination.currentPage + 1) : undefined;

        return {
            campaigns,
            ...(nextCursor !== undefined && { nextCursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
