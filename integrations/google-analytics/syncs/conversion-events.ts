import { createSync } from 'nango';
import { z } from 'zod';

const DefaultValueSchema = z.object({
    numericValue: z.number().optional(),
    currencyCode: z.string().optional()
});

const ProviderKeyEventSchema = z.object({
    name: z.string(),
    eventName: z.string().optional(),
    createTime: z.string().optional(),
    deletable: z.boolean().optional(),
    custom: z.boolean().optional(),
    countingMethod: z.string().optional(),
    defaultValue: DefaultValueSchema.optional()
});

const KeyEventSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    eventName: z.string().optional(),
    createTime: z.string().optional(),
    deletable: z.boolean().optional(),
    custom: z.boolean().optional(),
    countingMethod: z.string().optional(),
    defaultValue: DefaultValueSchema.optional()
});

const PropertySummarySchema = z.object({
    property: z.string().optional()
});

const AccountSummarySchema = z.object({
    propertySummaries: z.array(PropertySummarySchema).optional()
});

const AccountSummariesResponseSchema = z.object({
    accountSummaries: z.array(AccountSummarySchema).optional(),
    nextPageToken: z.string().optional()
});

const KeyEventsResponseSchema = z.object({
    keyEvents: z.array(ProviderKeyEventSchema).optional(),
    nextPageToken: z.string().optional()
});

const KeyEventsCheckpointSchema = z.object({
    accountSummariesPageToken: z.string(),
    accountSummaryIndex: z.number().int().nonnegative(),
    propertySummaryIndex: z.number().int().nonnegative(),
    keyEventsPageToken: z.string()
});

const sync = createSync({
    description: 'Sync configured GA4 key events (formerly conversion events)',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    models: {
        KeyEvent: KeyEventSchema
    },
    checkpoint: KeyEventsCheckpointSchema,
    endpoints: [
        {
            method: 'GET',
            path: '/syncs/conversion-events'
        }
    ],

    exec: async (nango) => {
        // keyEvents.list only exposes pageToken pagination and no
        // changed-since filter, so this remains a full refresh. The checkpoint
        // keeps the current account summary/property/page position so an
        // interrupted run can resume without restarting from the beginning.
        const checkpoint = await nango.getCheckpoint();
        let accountSummariesPageToken =
            checkpoint && typeof checkpoint['accountSummariesPageToken'] === 'string' ? checkpoint['accountSummariesPageToken'] : '';
        let accountSummaryIndex = checkpoint && typeof checkpoint['accountSummaryIndex'] === 'number' ? checkpoint['accountSummaryIndex'] : 0;
        let propertySummaryIndex = checkpoint && typeof checkpoint['propertySummaryIndex'] === 'number' ? checkpoint['propertySummaryIndex'] : 0;
        let keyEventsPageToken = checkpoint && typeof checkpoint['keyEventsPageToken'] === 'string' ? checkpoint['keyEventsPageToken'] : '';

        await nango.trackDeletesStart('KeyEvent');

        while (true) {
            const accountSummariesResponse = await nango.get({
                // https://developers.google.com/analytics/devguides/config/admin/v1/rest/v1beta/accountSummaries/list
                endpoint: '/v1beta/accountSummaries',
                baseUrlOverride: 'https://analyticsadmin.googleapis.com',
                params: {
                    pageSize: 50,
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
                        const propertyId = propertyName.startsWith('properties/') ? propertyName.slice('properties/'.length) : propertyName;
                        let currentKeyEventsPageToken =
                            currentAccountSummaryIndex === accountSummaryIndex && currentPropertySummaryIndex === propertySummaryIndex
                                ? keyEventsPageToken
                                : undefined;

                        while (true) {
                            const keyEventsResponse = await nango.get({
                                // https://developers.google.com/analytics/devguides/config/admin/v1/rest/v1beta/properties.keyEvents/list
                                endpoint: `/v1beta/properties/${encodeURIComponent(propertyId)}/keyEvents`,
                                baseUrlOverride: 'https://analyticsadmin.googleapis.com',
                                params: {
                                    pageSize: 50,
                                    ...(currentKeyEventsPageToken ? { pageToken: currentKeyEventsPageToken } : {})
                                },
                                retries: 3
                            });

                            const parsedKeyEventsResponse = KeyEventsResponseSchema.parse(keyEventsResponse.data);
                            const events = parsedKeyEventsResponse.keyEvents ?? [];
                            if (events.length > 0) {
                                const mapped = events.map((event) => ({
                                    id: event.name,
                                    ...(event.eventName !== undefined && { eventName: event.eventName }),
                                    ...(event.createTime !== undefined && { createTime: event.createTime }),
                                    ...(event.deletable !== undefined && { deletable: event.deletable }),
                                    ...(event.custom !== undefined && { custom: event.custom }),
                                    ...(event.countingMethod !== undefined && { countingMethod: event.countingMethod }),
                                    ...(event.defaultValue !== undefined && { defaultValue: event.defaultValue })
                                }));

                                await nango.batchSave(mapped, 'KeyEvent');
                            }

                            currentKeyEventsPageToken = parsedKeyEventsResponse.nextPageToken;
                            if (!currentKeyEventsPageToken) {
                                break;
                            }

                            await nango.saveCheckpoint({
                                accountSummariesPageToken,
                                accountSummaryIndex: currentAccountSummaryIndex,
                                propertySummaryIndex: currentPropertySummaryIndex,
                                keyEventsPageToken: currentKeyEventsPageToken
                            });
                        }
                    }

                    keyEventsPageToken = '';
                    if (currentPropertySummaryIndex + 1 < propertySummaries.length) {
                        await nango.saveCheckpoint({
                            accountSummariesPageToken,
                            accountSummaryIndex: currentAccountSummaryIndex,
                            propertySummaryIndex: currentPropertySummaryIndex + 1,
                            keyEventsPageToken: ''
                        });
                    }
                }

                propertySummaryIndex = 0;
                if (currentAccountSummaryIndex + 1 < accountSummaries.length) {
                    await nango.saveCheckpoint({
                        accountSummariesPageToken,
                        accountSummaryIndex: currentAccountSummaryIndex + 1,
                        propertySummaryIndex: 0,
                        keyEventsPageToken: ''
                    });
                }
            }

            if (!parsedAccountSummariesResponse.nextPageToken) {
                break;
            }

            accountSummariesPageToken = parsedAccountSummariesResponse.nextPageToken;
            accountSummaryIndex = 0;
            propertySummaryIndex = 0;
            keyEventsPageToken = '';

            await nango.saveCheckpoint({
                accountSummariesPageToken,
                accountSummaryIndex: 0,
                propertySummaryIndex: 0,
                keyEventsPageToken: ''
            });
        }

        await nango.clearCheckpoint();
        await nango.trackDeletesEnd('KeyEvent');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
