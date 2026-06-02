import { createSync } from 'nango';
import { z } from 'zod';

const DataStreamSchema = z.object({
    id: z.string(),
    displayName: z.string().optional(),
    type: z.string().optional(),
    propertyId: z.string(),
    measurementId: z.string().optional(),
    defaultUri: z.string().optional(),
    firebaseAppId: z.string().optional(),
    packageName: z.string().optional(),
    bundleId: z.string().optional(),
    createTime: z.string().optional(),
    updateTime: z.string().optional()
});

const AccountSummarySchema = z.object({
    propertySummaries: z
        .array(
            z.object({
                property: z.string()
            })
        )
        .optional()
});

const AccountSummariesResponseSchema = z.object({
    accountSummaries: z.array(AccountSummarySchema).optional(),
    nextPageToken: z.string().optional()
});

const DataStreamResponseSchema = z.object({
    name: z.string(),
    displayName: z.string().nullable().optional(),
    type: z.string().optional(),
    webStreamData: z
        .object({
            measurementId: z.string().optional(),
            defaultUri: z.string().optional(),
            firebaseAppId: z.string().optional()
        })
        .nullable()
        .optional(),
    iosAppStreamData: z
        .object({
            bundleId: z.string().optional(),
            firebaseAppId: z.string().optional()
        })
        .nullable()
        .optional(),
    androidAppStreamData: z
        .object({
            packageName: z.string().optional(),
            firebaseAppId: z.string().optional()
        })
        .nullable()
        .optional(),
    createTime: z.string().optional(),
    updateTime: z.string().optional()
});

const DataStreamsResponseSchema = z.object({
    dataStreams: z.array(DataStreamResponseSchema).optional(),
    nextPageToken: z.string().optional()
});

const DataStreamsCheckpointSchema = z.object({
    accountSummariesPageToken: z.string(),
    accountSummaryIndex: z.number().int().nonnegative(),
    propertySummaryIndex: z.number().int().nonnegative(),
    dataStreamsPageToken: z.string()
});

const sync = createSync({
    description: 'Sync web, iOS, and Android data streams for GA4 properties.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    models: {
        DataStream: DataStreamSchema
    },
    checkpoint: DataStreamsCheckpointSchema,
    endpoints: [
        {
            method: 'GET',
            path: '/syncs/data-streams'
        }
    ],

    exec: async (nango) => {
        // dataStreams.list exposes updateTime on the resource but no
        // changed-since filter, so this remains a full refresh. The
        // checkpoint stores the current account summary/property/page position
        // so interrupted runs can resume mid-scan.
        const checkpoint = await nango.getCheckpoint();
        let accountSummariesPageToken =
            checkpoint && typeof checkpoint['accountSummariesPageToken'] === 'string' ? checkpoint['accountSummariesPageToken'] : '';
        let accountSummaryIndex = checkpoint && typeof checkpoint['accountSummaryIndex'] === 'number' ? checkpoint['accountSummaryIndex'] : 0;
        let propertySummaryIndex = checkpoint && typeof checkpoint['propertySummaryIndex'] === 'number' ? checkpoint['propertySummaryIndex'] : 0;
        let dataStreamsPageToken = checkpoint && typeof checkpoint['dataStreamsPageToken'] === 'string' ? checkpoint['dataStreamsPageToken'] : '';

        await nango.trackDeletesStart('DataStream');

        while (true) {
            const accountSummariesResponse = await nango.get({
                // https://developers.google.com/analytics/devguides/config/admin/v1/rest/v1beta/accountSummaries/list
                endpoint: '/v1beta/accountSummaries',
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
                        let currentDataStreamsPageToken =
                            currentAccountSummaryIndex === accountSummaryIndex && currentPropertySummaryIndex === propertySummaryIndex
                                ? dataStreamsPageToken
                                : undefined;

                        while (true) {
                            const dataStreamsResponse = await nango.get({
                                // https://developers.google.com/analytics/devguides/config/admin/v1/rest/v1beta/properties.dataStreams/list
                                endpoint: `/v1beta/properties/${encodeURIComponent(propertyId)}/dataStreams`,
                                baseUrlOverride: 'https://analyticsadmin.googleapis.com',
                                params: {
                                    pageSize: 100,
                                    ...(currentDataStreamsPageToken ? { pageToken: currentDataStreamsPageToken } : {})
                                },
                                retries: 3
                            });

                            const parsedDataStreamsResponse = DataStreamsResponseSchema.parse(dataStreamsResponse.data);
                            const records = (parsedDataStreamsResponse.dataStreams ?? []).map((stream) => {
                                const webData = stream.webStreamData;
                                const iosData = stream.iosAppStreamData;
                                const androidData = stream.androidAppStreamData;

                                return {
                                    id: stream.name,
                                    ...(stream.displayName != null && { displayName: stream.displayName }),
                                    ...(stream.type != null && { type: stream.type }),
                                    propertyId: propertyName,
                                    ...(webData?.measurementId != null && { measurementId: webData.measurementId }),
                                    ...(webData?.defaultUri != null && { defaultUri: webData.defaultUri }),
                                    ...(webData?.firebaseAppId != null && { firebaseAppId: webData.firebaseAppId }),
                                    ...(iosData?.bundleId != null && { bundleId: iosData.bundleId }),
                                    ...(iosData?.firebaseAppId != null && { firebaseAppId: iosData.firebaseAppId }),
                                    ...(androidData?.packageName != null && { packageName: androidData.packageName }),
                                    ...(androidData?.firebaseAppId != null && { firebaseAppId: androidData.firebaseAppId }),
                                    ...(stream.createTime != null && { createTime: stream.createTime }),
                                    ...(stream.updateTime != null && { updateTime: stream.updateTime })
                                };
                            });

                            if (records.length > 0) {
                                await nango.batchSave(records, 'DataStream');
                            }

                            currentDataStreamsPageToken = parsedDataStreamsResponse.nextPageToken;
                            if (!currentDataStreamsPageToken) {
                                break;
                            }

                            await nango.saveCheckpoint({
                                accountSummariesPageToken,
                                accountSummaryIndex: currentAccountSummaryIndex,
                                propertySummaryIndex: currentPropertySummaryIndex,
                                dataStreamsPageToken: currentDataStreamsPageToken
                            });
                        }
                    }

                    dataStreamsPageToken = '';
                    if (currentPropertySummaryIndex + 1 < propertySummaries.length) {
                        await nango.saveCheckpoint({
                            accountSummariesPageToken,
                            accountSummaryIndex: currentAccountSummaryIndex,
                            propertySummaryIndex: currentPropertySummaryIndex + 1,
                            dataStreamsPageToken: ''
                        });
                    }
                }

                propertySummaryIndex = 0;
                if (currentAccountSummaryIndex + 1 < accountSummaries.length) {
                    await nango.saveCheckpoint({
                        accountSummariesPageToken,
                        accountSummaryIndex: currentAccountSummaryIndex + 1,
                        propertySummaryIndex: 0,
                        dataStreamsPageToken: ''
                    });
                }
            }

            if (!parsedAccountSummariesResponse.nextPageToken) {
                break;
            }

            accountSummariesPageToken = parsedAccountSummariesResponse.nextPageToken;
            accountSummaryIndex = 0;
            propertySummaryIndex = 0;
            dataStreamsPageToken = '';

            await nango.saveCheckpoint({
                accountSummariesPageToken,
                accountSummaryIndex: 0,
                propertySummaryIndex: 0,
                dataStreamsPageToken: ''
            });
        }

        await nango.clearCheckpoint();
        await nango.trackDeletesEnd('DataStream');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
