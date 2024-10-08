import type { NangoSync, ProxyConfiguration, Deal, LineItemDefaultProperties } from '../../models';
import type { DealLineItemAssociationResponse, Association } from '../types';
import { getProperties } from '../helpers/get-properties.js';

export default async function fetchData(nango: NangoSync): Promise<void> {
    const properties = await getProperties(nango, 'deals');

    const config: ProxyConfiguration = getConfig(properties);

    for await (const rawDeals of nango.paginate(config)) {
        const deals: Deal[] = [];
        for (const rawDeal of rawDeals) {
            const deal: Deal = {
                id: rawDeal.id,
                ...rawDeal.properties
            };

            if (rawDeal.associations) {
                if (rawDeal.associations.companies) {
                    const companies = rawDeal.associations.companies.results.map((result: Association) => {
                        return {
                            id: result.id,
                            primary: result.type === 'deal_to_company'
                        };
                    });
                    const uniqueCompanies = companies.filter((company: { id: string }, index: number, self: { id: string }[]) => {
                        return index === self.findIndex((t: { id: string }) => t.id === company.id);
                    });
                    deal['companies'] = uniqueCompanies;
                }

                if (rawDeal.associations.contacts) {
                    deal['contacts'] = rawDeal.associations.contacts.results.map((result: Association) => {
                        return {
                            id: result.id
                        };
                    });
                }
            }

            if (rawDeal.properties.hs_num_of_associated_line_items && rawDeal.properties.hs_num_of_associated_line_items !== '0') {
                const dealConfig: ProxyConfiguration = {
                    // https://developers.hubspot.com/docs/api/crm/associations
                    endpoint: `/crm/v3/objects/deals/${rawDeal.id}/associations/line_items`,
                    retries: 10
                };
                const response = await nango.get<DealLineItemAssociationResponse>(dealConfig);
                const lineItemIds = response.data.results.map((result: Association) => result.id);
                const lineItemProperties = await getProperties(nango, 'line_items');

                const lineItemConfig: ProxyConfiguration = {
                    // https://developers.hubspot.com/docs/api/crm/line-items
                    endpoint: '/crm/v3/objects/line_items/batch/read',
                    data: {
                        inputs: lineItemIds.map((id: string) => {
                            return {
                                id
                            };
                        }),
                        properties: lineItemProperties
                    },
                    retries: 10
                };

                const lineItemResponse = await nango.post(lineItemConfig);
                deal['lineItems'] = lineItemResponse.data.results.map((result: { id: string; properties: LineItemDefaultProperties }) => {
                    return {
                        id: result.id,
                        ...result.properties
                    };
                });
            }
            deals.push(deal);
        }

        await nango.batchSave(deals, 'Deal');
    }
}

function getConfig(properties: string[]) {
    const associations = ['companies', 'contacts'];

    const config: ProxyConfiguration = {
        endpoint: '/crm/v3/objects/deals',
        method: 'GET',
        params: {
            properties: properties.join(','),
            associations: associations.join(',')
        },
        retries: 10
    };

    return config;
}
