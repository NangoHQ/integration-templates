import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('Campaign ID. Example: "1"'),
    name: z.string().optional().describe('Campaign name'),
    type: z.string().optional().describe('Campaign type'),
    segmentId: z.string().optional().describe('Id of selected segment. Both integer segment ids and string based segment ids are supported.'),
    addressId: z.number().optional().describe('Id of selected address'),
    listIds: z.array(z.number()).optional().describe('Array of selected list ids'),
    replyTrackingEnabled: z.boolean().optional().describe('Turn on/off reply tracking'),
    linkTrackingEnabled: z.boolean().optional().describe('Turn on/off link tracking'),
    googleAnalyticsLinkTrackingEnabled: z.boolean().optional().describe('Turn on/off google analytics link tracking'),
    googleAnalyticsCampaignName: z.string().optional().describe('Name of campaign in google analytics'),
    readTrackingEnabled: z.boolean().optional().describe('Turn on/off read tracking'),
    sendToExistingSubscribers: z.boolean().optional().describe('Should send only to existing customers'),
    canSplitContent: z.boolean().optional().describe('Campaign can contain split content'),
    recurring: z.boolean().optional().describe('Is campaign recurring'),
    responderDaysOffset: z.number().optional().describe('Determine value of responder offset in days'),
    responderHoursOffset: z.number().optional().describe('Determine value of responder offset in hours'),
    scheduledDate: z.string().optional().describe('Date of sending'),
    reminderField: z.string().optional().describe('Field based on which reminder will be triggered'),
    reminderOffset: z.number().optional().describe('Value of reminder offset'),
    reminderOffsetType: z.string().optional().describe('Type of reminder offset'),
    reminderType: z.string().optional().describe('Format of reminder date'),
    rssInterval: z.number().optional().describe('Interval for RSS'),
    splitType: z.string().optional().describe('Type of split campaign'),
    splitWinnerWaitPeriod: z.number().optional().describe('Period wait time'),
    splitWinnerWaitPeriodType: z.string().optional().describe('Determine period type'),
    publicCampaignArchive: z.boolean().optional().describe('Is campaign public')
});

const ProviderCampaignSchema = z.object({
    id: z.union([z.string(), z.number()]),
    name: z.string().nullable().optional(),
    type: z.string().nullable().optional(),
    canSplitContent: z.boolean().nullable().optional(),
    segmentId: z.union([z.string(), z.number()]).nullable().optional(),
    scheduledDate: z.string().nullable().optional(),
    addressId: z.union([z.string(), z.number()]).nullable().optional(),
    publicCampaignArchive: z.boolean().nullable().optional(),
    googleAnalyticsLinkTrackingEnabled: z.boolean().nullable().optional(),
    googleAnalyticsCampaignName: z.string().nullable().optional(),
    readTrackingEnabled: z.boolean().nullable().optional(),
    linkTrackingEnabled: z.boolean().nullable().optional(),
    replyTrackingEnabled: z.boolean().nullable().optional(),
    status: z.string().nullable().optional(),
    listIds: z
        .array(z.union([z.string(), z.number()]))
        .nullable()
        .optional()
});

const OutputSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    type: z.string().optional(),
    canSplitContent: z.boolean().optional(),
    segmentId: z.string().optional(),
    scheduledDate: z.string().nullable().optional(),
    addressId: z.string().optional(),
    publicCampaignArchive: z.boolean().optional(),
    googleAnalyticsLinkTrackingEnabled: z.boolean().optional(),
    googleAnalyticsCampaignName: z.string().optional(),
    readTrackingEnabled: z.boolean().optional(),
    linkTrackingEnabled: z.boolean().optional(),
    replyTrackingEnabled: z.boolean().optional(),
    status: z.string().optional(),
    listIds: z.array(z.string()).optional()
});

function toArrayOfStringsOrUndefined(value: unknown): string[] | undefined {
    if (value === undefined || value === null) {
        return undefined;
    }
    if (!Array.isArray(value)) {
        return undefined;
    }
    return value.map((v) => String(v));
}

const action = createAction({
    description: 'Update a campaign in ActiveCampaign.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/update-campaign',
        group: 'Campaigns'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['campaigns'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const data: {
            name?: string;
            type?: string;
            segmentId?: string;
            addressId?: number;
            listIds?: number[];
            replyTrackingEnabled?: boolean;
            linkTrackingEnabled?: boolean;
            googleAnalyticsLinkTrackingEnabled?: boolean;
            googleAnalyticsCampaignName?: string;
            readTrackingEnabled?: boolean;
            sendToExistingSubscribers?: boolean;
            canSplitContent?: boolean;
            recurring?: boolean;
            responderDaysOffset?: number;
            responderHoursOffset?: number;
            scheduledDate?: string;
            reminderField?: string;
            reminderOffset?: number;
            reminderOffsetType?: string;
            reminderType?: string;
            rssInterval?: number;
            splitType?: string;
            splitWinnerWaitPeriod?: number;
            splitWinnerWaitPeriodType?: string;
            publicCampaignArchive?: boolean;
        } = {};

        if (input.name !== undefined) {
            data.name = input.name;
        }
        if (input.type !== undefined) {
            data.type = input.type;
        }
        if (input.segmentId !== undefined) {
            data.segmentId = input.segmentId;
        }
        if (input.addressId !== undefined) {
            data.addressId = input.addressId;
        }
        if (input.listIds !== undefined) {
            data.listIds = input.listIds;
        }
        if (input.replyTrackingEnabled !== undefined) {
            data.replyTrackingEnabled = input.replyTrackingEnabled;
        }
        if (input.linkTrackingEnabled !== undefined) {
            data.linkTrackingEnabled = input.linkTrackingEnabled;
        }
        if (input.googleAnalyticsLinkTrackingEnabled !== undefined) {
            data.googleAnalyticsLinkTrackingEnabled = input.googleAnalyticsLinkTrackingEnabled;
        }
        if (input.googleAnalyticsCampaignName !== undefined) {
            data.googleAnalyticsCampaignName = input.googleAnalyticsCampaignName;
        }
        if (input.readTrackingEnabled !== undefined) {
            data.readTrackingEnabled = input.readTrackingEnabled;
        }
        if (input.sendToExistingSubscribers !== undefined) {
            data.sendToExistingSubscribers = input.sendToExistingSubscribers;
        }
        if (input.canSplitContent !== undefined) {
            data.canSplitContent = input.canSplitContent;
        }
        if (input.recurring !== undefined) {
            data.recurring = input.recurring;
        }
        if (input.responderDaysOffset !== undefined) {
            data.responderDaysOffset = input.responderDaysOffset;
        }
        if (input.responderHoursOffset !== undefined) {
            data.responderHoursOffset = input.responderHoursOffset;
        }
        if (input.scheduledDate !== undefined) {
            data.scheduledDate = input.scheduledDate;
        }
        if (input.reminderField !== undefined) {
            data.reminderField = input.reminderField;
        }
        if (input.reminderOffset !== undefined) {
            data.reminderOffset = input.reminderOffset;
        }
        if (input.reminderOffsetType !== undefined) {
            data.reminderOffsetType = input.reminderOffsetType;
        }
        if (input.reminderType !== undefined) {
            data.reminderType = input.reminderType;
        }
        if (input.rssInterval !== undefined) {
            data.rssInterval = input.rssInterval;
        }
        if (input.splitType !== undefined) {
            data.splitType = input.splitType;
        }
        if (input.splitWinnerWaitPeriod !== undefined) {
            data.splitWinnerWaitPeriod = input.splitWinnerWaitPeriod;
        }
        if (input.splitWinnerWaitPeriodType !== undefined) {
            data.splitWinnerWaitPeriodType = input.splitWinnerWaitPeriodType;
        }
        if (input.publicCampaignArchive !== undefined) {
            data.publicCampaignArchive = input.publicCampaignArchive;
        }

        const response = await nango.patch({
            // https://developers.activecampaign.com/reference/edit-campaign
            endpoint: `/3/campaigns/${encodeURIComponent(input.id)}`,
            data,
            retries: 10
        });

        if (!response.data || typeof response.data !== 'object') {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Campaign not found or update failed',
                campaignId: input.id
            });
        }

        const rawData: unknown = 'campaign' in response.data ? response.data.campaign : response.data;

        if (!rawData || typeof rawData !== 'object') {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Campaign not found or update failed',
                campaignId: input.id
            });
        }

        const providerCampaign = ProviderCampaignSchema.parse(rawData);

        return {
            id: String(providerCampaign.id),
            ...(providerCampaign.name != null && { name: providerCampaign.name }),
            ...(providerCampaign.type != null && { type: providerCampaign.type }),
            ...(providerCampaign.canSplitContent != null && { canSplitContent: providerCampaign.canSplitContent }),
            ...(providerCampaign.segmentId != null && { segmentId: String(providerCampaign.segmentId) }),
            ...(providerCampaign.scheduledDate !== undefined && { scheduledDate: providerCampaign.scheduledDate }),
            ...(providerCampaign.addressId != null && { addressId: String(providerCampaign.addressId) }),
            ...(providerCampaign.publicCampaignArchive != null && { publicCampaignArchive: providerCampaign.publicCampaignArchive }),
            ...(providerCampaign.googleAnalyticsLinkTrackingEnabled != null && {
                googleAnalyticsLinkTrackingEnabled: providerCampaign.googleAnalyticsLinkTrackingEnabled
            }),
            ...(providerCampaign.googleAnalyticsCampaignName != null && { googleAnalyticsCampaignName: providerCampaign.googleAnalyticsCampaignName }),
            ...(providerCampaign.readTrackingEnabled != null && { readTrackingEnabled: providerCampaign.readTrackingEnabled }),
            ...(providerCampaign.linkTrackingEnabled != null && { linkTrackingEnabled: providerCampaign.linkTrackingEnabled }),
            ...(providerCampaign.replyTrackingEnabled != null && { replyTrackingEnabled: providerCampaign.replyTrackingEnabled }),
            ...(providerCampaign.status != null && { status: providerCampaign.status }),
            ...(providerCampaign.listIds != null && { listIds: toArrayOfStringsOrUndefined(providerCampaign.listIds) })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
