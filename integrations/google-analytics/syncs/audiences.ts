import { createSync } from 'nango';
import { z } from 'zod';

const AudienceSchema = z.object({
    name: z.string(),
    displayName: z.string().optional(),
    description: z.string().optional(),
    membershipDurationDays: z.number().int().optional(),
    adsPersonalizationEnabled: z.boolean().optional(),
    eventTrigger: z.unknown().optional(),
    exclusionDurationMode: z.string().optional(),
    filterClauses: z.array(z.unknown()).optional(),
    createTime: z.string().optional()
});

const AudienceModelSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    displayName: z.string().optional(),
    description: z.string().optional(),
    membershipDurationDays: z.number().int().optional(),
    adsPersonalizationEnabled: z.boolean().optional(),
    eventTrigger: z.unknown().optional(),
    exclusionDurationMode: z.string().optional(),
    filterClauses: z.array(z.unknown()).optional(),
    createTime: z.string().optional(),
    propertyId: z.string().optional()
});

const AccountSummarySchema = z.object({
    propertySummaries: z.array(z.object({ property: z.string().optional() })).optional()
});

const AccountSummariesResponseSchema = z.object({
    accountSummaries: z.array(AccountSummarySchema).optional(),
    nextPageToken: z.string().optional()
});

const AudiencesResponseSchema = z.object({
    audiences: z.array(AudienceSchema).optional(),
    nextPageToken: z.string().optional()
});

const AudiencesCheckpointSchema = z.object({
    accountSummariesPageToken: z.string(),
    accountSummaryIndex: z.number().int().nonnegative(),
    propertySummaryIndex: z.number().int().nonnegative(),
    audiencesPageToken: z.string()
});

const sync = createSync({
    description: 'Sync GA4 audiences for properties.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    endpoints: [{ path: '/syncs/audiences', method: 'GET' }],
    models: {
        Audience: AudienceModelSchema
    },
    checkpoint: AudiencesCheckpointSchema,

    exec: async (nango) => {
        // Audience only exposes createTime and the list endpoint does not
        // support changed-since filtering, so this remains a full refresh. The
        // checkpoint stores the current account summary/property/page position
        // so interrupted runs can resume mid-scan.
        const checkpoint = await nango.getCheckpoint();
        let accountSummariesPageToken =
            checkpoint && typeof checkpoint['accountSummariesPageToken'] === 'string' ? checkpoint['accountSummariesPageToken'] : '';
        let accountSummaryIndex = checkpoint && typeof checkpoint['accountSummaryIndex'] === 'number' ? checkpoint['accountSummaryIndex'] : 0;
        let propertySummaryIndex = checkpoint && typeof checkpoint['propertySummaryIndex'] === 'number' ? checkpoint['propertySummaryIndex'] : 0;
        let audiencesPageToken = checkpoint && typeof checkpoint['audiencesPageToken'] === 'string' ? checkpoint['audiencesPageToken'] : '';

        await nango.trackDeletesStart('Audience');

        while (true) {
            const accountSummariesResponse = await nango.get({
                // https://developers.google.com/analytics/devguides/config/admin/v1/rest/v1alpha/accountSummaries/list
                endpoint: '/v1alpha/accountSummaries',
                baseUrlOverride: 'https://analyticsadmin.googleapis.com',
                params: {
                    pageSize: 100,
                    ...(accountSummariesPageToken ? { pageToken: accountSummariesPageToken } : {})
                },
                retries: 3
            });

            const parsedAccountSummariesResponse = AccountSummariesResponseSchema.parse(accountSummariesResponse.data);
            const accountSummaries = parsedAccountSummariesResponse.accountSummaries ?? [];

            for (let currentAccountSummaryIndex = accountSummaryIndex; currentAccountSummaryIndex < accountSummaries.length; currentAccountSummaryIndex++) {
                const accountSummary = accountSummaries[currentAccountSummaryIndex];
                if (!accountSummary) {
                    continue;
                }

                const propertySummaries = accountSummary.propertySummaries ?? [];
                const propertyStartIndex = currentAccountSummaryIndex === accountSummaryIndex ? propertySummaryIndex : 0;

                for (
                    let currentPropertySummaryIndex = propertyStartIndex;
                    currentPropertySummaryIndex < propertySummaries.length;
                    currentPropertySummaryIndex++
                ) {
                    const propertySummary = propertySummaries[currentPropertySummaryIndex];
                    if (!propertySummary) {
                        continue;
                    }

                    const propertyName = propertySummary.property;

                    if (propertyName) {
                        const propertyId = propertyName.replace('properties/', '');
                        let currentAudiencesPageToken =
                            currentAccountSummaryIndex === accountSummaryIndex && currentPropertySummaryIndex === propertySummaryIndex
                                ? audiencesPageToken
                                : undefined;

                        while (true) {
                            const audiencesResponse = await nango.get({
                                // https://developers.google.com/analytics/devguides/config/admin/v1/rest/v1alpha/properties.audiences/list
                                endpoint: `/v1alpha/properties/${encodeURIComponent(propertyId)}/audiences`,
                                baseUrlOverride: 'https://analyticsadmin.googleapis.com',
                                params: {
                                    pageSize: 100,
                                    ...(currentAudiencesPageToken ? { pageToken: currentAudiencesPageToken } : {})
                                },
                                retries: 3
                            });

                            const parsedAudiencesResponse = AudiencesResponseSchema.parse(audiencesResponse.data);
                            const records = (parsedAudiencesResponse.audiences ?? []).map((audience) => ({
                                id: audience.name,
                                ...(audience.displayName != null && { displayName: audience.displayName }),
                                ...(audience.description != null && { description: audience.description }),
                                ...(audience.membershipDurationDays != null && { membershipDurationDays: audience.membershipDurationDays }),
                                ...(audience.adsPersonalizationEnabled != null && { adsPersonalizationEnabled: audience.adsPersonalizationEnabled }),
                                ...(audience.eventTrigger != null && { eventTrigger: audience.eventTrigger }),
                                ...(audience.exclusionDurationMode != null && { exclusionDurationMode: audience.exclusionDurationMode }),
                                ...(audience.filterClauses != null && { filterClauses: audience.filterClauses }),
                                ...(audience.createTime != null && { createTime: audience.createTime }),
                                propertyId
                            }));

                            if (records.length > 0) {
                                await nango.batchSave(records, 'Audience');
                            }

                            currentAudiencesPageToken = parsedAudiencesResponse.nextPageToken;
                            if (!currentAudiencesPageToken) {
                                break;
                            }

                            await nango.saveCheckpoint({
                                accountSummariesPageToken,
                                accountSummaryIndex: currentAccountSummaryIndex,
                                propertySummaryIndex: currentPropertySummaryIndex,
                                audiencesPageToken: currentAudiencesPageToken
                            });
                        }
                    }

                    audiencesPageToken = '';
                    if (currentPropertySummaryIndex + 1 < propertySummaries.length) {
                        await nango.saveCheckpoint({
                            accountSummariesPageToken,
                            accountSummaryIndex: currentAccountSummaryIndex,
                            propertySummaryIndex: currentPropertySummaryIndex + 1,
                            audiencesPageToken: ''
                        });
                    }
                }

                propertySummaryIndex = 0;
                if (currentAccountSummaryIndex + 1 < accountSummaries.length) {
                    await nango.saveCheckpoint({
                        accountSummariesPageToken,
                        accountSummaryIndex: currentAccountSummaryIndex + 1,
                        propertySummaryIndex: 0,
                        audiencesPageToken: ''
                    });
                }
            }

            if (!parsedAccountSummariesResponse.nextPageToken) {
                break;
            }

            accountSummariesPageToken = parsedAccountSummariesResponse.nextPageToken;
            accountSummaryIndex = 0;
            propertySummaryIndex = 0;
            audiencesPageToken = '';

            await nango.saveCheckpoint({
                accountSummariesPageToken,
                accountSummaryIndex: 0,
                propertySummaryIndex: 0,
                audiencesPageToken: ''
            });
        }

        await nango.clearCheckpoint();
        await nango.trackDeletesEnd('Audience');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
