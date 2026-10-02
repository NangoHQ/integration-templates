import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        listId: z.number().int().positive().describe('ID of the contact list to retrieve. Example: 2')
    })
    .describe('Input for retrieving a single Brevo contact list');

const ProviderCampaignStatsSchema = z.object({
    campaignId: z.number(),
    stats: z.record(z.string(), z.unknown())
});

const ProviderContactListSchema = z.object({
    id: z.number(),
    name: z.string(),
    totalBlacklisted: z.number(),
    totalSubscribers: z.number(),
    uniqueSubscribers: z.number(),
    folderId: z.number(),
    createdAt: z.string(),
    campaignStats: z.array(ProviderCampaignStatsSchema).optional(),
    dynamicList: z.boolean().optional(),
    startDate: z.string().nullable().optional(),
    endDate: z.string().nullable().optional()
});

const CampaignStatsSchema = z
    .object({
        campaignId: z.number().describe('ID of the email campaign that was sent to this list'),
        stats: z
            .record(z.string(), z.unknown())
            .describe('Aggregated engagement statistics of the campaign for this list (sent, delivered, opens, clicks, bounces, etc.) as returned by Brevo')
    })
    .describe('Engagement statistics of a single email campaign sent to this list');

const OutputSchema = z
    .object({
        id: z.number().describe('ID of the contact list'),
        name: z.string().describe('Name of the contact list'),
        folderId: z.number().describe('ID of the folder the contact list belongs to'),
        createdAt: z.string().describe('Creation UTC date-time of the list (YYYY-MM-DDTHH:mm:ss.SSSZ)'),
        totalBlacklisted: z.number().describe('Number of blacklisted contacts in the list'),
        totalSubscribers: z.number().describe('Number of contacts in the list'),
        uniqueSubscribers: z.number().describe('Number of unique contacts in the list'),
        dynamicList: z.boolean().optional().describe('Whether the list is dynamic (true) or not (false). Omitted when Brevo does not report it'),
        startDate: z
            .string()
            .optional()
            .describe(
                'Start of the date range over which campaignStats are aggregated (UTC date-time). Brevo defaults this to a rolling window ending at call time when no explicit range is requested'
            ),
        endDate: z
            .string()
            .optional()
            .describe(
                'End of the date range over which campaignStats are aggregated (UTC date-time). Brevo defaults this to the time of the call when no explicit range is requested'
            ),
        campaignStats: z.array(CampaignStatsSchema).optional().describe('Per-campaign engagement statistics for email campaigns sent to this list')
    })
    .describe('Details of a single Brevo contact list');

/**
 * @tags: [read]
 * @tagReason: Performs a single provider read (GET) of a contact list and makes no provider mutations.
 * @pitfalls: startDate and endDate are not static properties of the list; they echo the campaignStats aggregation window, which defaults to a rolling range ending at call time, so their values change on every call.
 */
const action = createAction({
    description: 'Retrieve the details of a single Brevo contact list by its ID',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developers.brevo.com/reference/get-list
        const response = await nango.get({
            endpoint: `/contacts/lists/${input.listId}`,
            retries: 3
        });

        const list = ProviderContactListSchema.parse(response.data);

        return {
            id: list.id,
            name: list.name,
            folderId: list.folderId,
            createdAt: list.createdAt,
            totalBlacklisted: list.totalBlacklisted,
            totalSubscribers: list.totalSubscribers,
            uniqueSubscribers: list.uniqueSubscribers,
            ...(list.dynamicList !== undefined && { dynamicList: list.dynamicList }),
            ...(list.startDate != null && { startDate: list.startDate }),
            ...(list.endDate != null && { endDate: list.endDate }),
            ...(list.campaignStats !== undefined && { campaignStats: list.campaignStats })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
