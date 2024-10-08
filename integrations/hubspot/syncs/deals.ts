import type { NangoSync, ProxyConfiguration, Deal, DealDefaultProperties, Property } from '../../models';

export default async function fetchData(nango: NangoSync): Promise<void> {
    const propertyConfig: ProxyConfiguration = {
        // https://developers.hubspot.com/docs/api/crm/properties
        endpoint: `crm/v3/properties/deals`,
        retries: 10
    };
    const response = await nango.get(propertyConfig);

    const properties = response.data.results.map((result: Property) => {
        return result.name;
    });

    const config: ProxyConfiguration = getConfig(nango, properties);

    for await (const rawDeals of nango.paginate(config)) {
        const deals: Deal[] = rawDeals.map((rawDeal: { id: string; properties: DealDefaultProperties }) => {
            return {
                id: rawDeal.id,
                ...rawDeal.properties
            };
        });
        await nango.batchSave(deals, 'Deal');
    }
}

function getConfig(nango: NangoSync, properties: string[]) {
    if (nango.lastSyncDate) {
        const config: ProxyConfiguration = {
            endpoint: '/crm/v3/objects/deals/search',
            method: 'POST',
            data: {
                filterGroups: [
                    {
                        filters: [
                            {
                                propertyName: 'hs_lastmodifieddate',
                                operator: 'GT',
                                value: nango.lastSyncDate?.toISOString()
                            }
                        ]
                    }
                ],
                sorts: [
                    {
                        propertyName: 'hs_lastmodifieddate',
                        direction: 'ASCENDING'
                    }
                ],
                properties
            },
            retries: 10
        };

        return config;
    } else {
        const config: ProxyConfiguration = {
            endpoint: '/crm/v3/objects/deals',
            method: 'GET',
            params: {
                properties: properties.join(',')
            },
            retries: 10
        };

        return config;
    }
}
