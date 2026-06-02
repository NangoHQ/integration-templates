import { createSync } from 'nango';
import { z } from 'zod';

const AccountSchema = z.object({
    name: z.string()
});

const AccountsResponseSchema = z.object({
    accounts: z.array(AccountSchema).optional(),
    nextPageToken: z.string().optional()
});

const ProviderPropertySchema = z.object({
    name: z.string(),
    displayName: z.string().optional(),
    propertyType: z.string().optional(),
    parent: z.string().optional(),
    createTime: z.string().optional(),
    updateTime: z.string().optional(),
    timeZone: z.string().optional(),
    currencyCode: z.string().optional(),
    industryCategory: z.string().optional(),
    serviceLevel: z.string().optional()
});

const PropertiesResponseSchema = z.object({
    properties: z.array(ProviderPropertySchema).optional(),
    nextPageToken: z.string().optional()
});

const PropertySchema = z.object({
    id: z.string(),
    displayName: z.string().optional(),
    propertyType: z.string().optional(),
    parent: z.string().optional(),
    createTime: z.string().optional(),
    updateTime: z.string().optional(),
    timeZone: z.string().optional(),
    currencyCode: z.string().optional(),
    industryCategory: z.string().optional(),
    serviceLevel: z.string().optional()
});

const PropertiesCheckpointSchema = z.object({
    accountsPageToken: z.string(),
    accountIndex: z.number().int().nonnegative(),
    propertiesPageToken: z.string()
});

const sync = createSync({
    description: 'Sync GA4 properties across accessible accounts.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    endpoints: [{ method: 'POST', path: '/syncs/properties' }],
    models: {
        Property: PropertySchema
    },
    checkpoint: PropertiesCheckpointSchema,

    exec: async (nango) => {
        // properties.list only supports parent/ancestor/firebase_project
        // filters, so this remains a full refresh. The checkpoint keeps track
        // of the current account page and property page so interrupted runs can
        // resume mid-scan.
        const checkpoint = await nango.getCheckpoint();
        let accountsPageToken = checkpoint && typeof checkpoint['accountsPageToken'] === 'string' ? checkpoint['accountsPageToken'] : '';
        let accountIndex = checkpoint && typeof checkpoint['accountIndex'] === 'number' ? checkpoint['accountIndex'] : 0;
        let propertiesPageToken = checkpoint && typeof checkpoint['propertiesPageToken'] === 'string' ? checkpoint['propertiesPageToken'] : '';

        await nango.trackDeletesStart('Property');

        while (true) {
            const accountsResponse = await nango.get({
                // https://developers.google.com/analytics/devguides/config/admin/v1/rest/v1beta/accounts/list
                endpoint: '/v1beta/accounts',
                baseUrlOverride: 'https://analyticsadmin.googleapis.com',
                params: {
                    pageSize: 100,
                    ...(accountsPageToken ? { pageToken: accountsPageToken } : {})
                },
                retries: 3
            });

            const parsedAccountsResponse = AccountsResponseSchema.parse(accountsResponse.data);
            const accounts = parsedAccountsResponse.accounts ?? [];

            for (let currentAccountIndex = accountIndex; currentAccountIndex < accounts.length; currentAccountIndex++) {
                const account = accounts[currentAccountIndex];
                if (!account) {
                    continue;
                }

                const accountName = account.name;
                let currentPropertiesPageToken = currentAccountIndex === accountIndex ? propertiesPageToken : undefined;

                while (true) {
                    const propertiesResponse = await nango.get({
                        // https://developers.google.com/analytics/devguides/config/admin/v1/rest/v1beta/properties/list
                        endpoint: '/v1beta/properties',
                        baseUrlOverride: 'https://analyticsadmin.googleapis.com',
                        params: {
                            filter: `parent:${accountName}`,
                            pageSize: 100,
                            ...(currentPropertiesPageToken ? { pageToken: currentPropertiesPageToken } : {})
                        },
                        retries: 3
                    });

                    const parsedPropertiesResponse = PropertiesResponseSchema.parse(propertiesResponse.data);
                    const mappedProperties = (parsedPropertiesResponse.properties ?? []).map((property) => ({
                        id: property.name,
                        ...(property.displayName != null && { displayName: property.displayName }),
                        ...(property.propertyType != null && { propertyType: property.propertyType }),
                        ...(property.parent != null && { parent: property.parent }),
                        ...(property.createTime != null && { createTime: property.createTime }),
                        ...(property.updateTime != null && { updateTime: property.updateTime }),
                        ...(property.timeZone != null && { timeZone: property.timeZone }),
                        ...(property.currencyCode != null && { currencyCode: property.currencyCode }),
                        ...(property.industryCategory != null && { industryCategory: property.industryCategory }),
                        ...(property.serviceLevel != null && { serviceLevel: property.serviceLevel })
                    }));

                    if (mappedProperties.length > 0) {
                        await nango.batchSave(mappedProperties, 'Property');
                    }

                    currentPropertiesPageToken = parsedPropertiesResponse.nextPageToken;
                    if (!currentPropertiesPageToken) {
                        break;
                    }

                    await nango.saveCheckpoint({
                        accountsPageToken,
                        accountIndex: currentAccountIndex,
                        propertiesPageToken: currentPropertiesPageToken
                    });
                }

                propertiesPageToken = '';
                if (currentAccountIndex + 1 < accounts.length) {
                    await nango.saveCheckpoint({
                        accountsPageToken,
                        accountIndex: currentAccountIndex + 1,
                        propertiesPageToken: ''
                    });
                }
            }

            if (!parsedAccountsResponse.nextPageToken) {
                break;
            }

            accountsPageToken = parsedAccountsResponse.nextPageToken;
            accountIndex = 0;
            propertiesPageToken = '';

            await nango.saveCheckpoint({
                accountsPageToken,
                accountIndex: 0,
                propertiesPageToken: ''
            });
        }

        await nango.clearCheckpoint();
        await nango.trackDeletesEnd('Property');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
