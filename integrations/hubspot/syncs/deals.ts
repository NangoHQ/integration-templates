import type { NangoSync } from '../../models';
import { paginateHubSpot } from '../helpers/paginateHubSpot';

export interface Deal {
    id: string;
    properties: Record<string, any>;
}

export default async function fetchDeals(nango: NangoSync): Promise<void> {
    try {
        const requiredProperties = ['dealname', 'amount', 'dealstage', 'closedate', 'createdate'];
        const limit = 100;
        const allDeals: Deal[] = [];
        const isIncremental = !!nango.lastSyncDate;

        let endpoint: string;
        let method: 'get' | 'post';
        let paramsOrData: any;

        if (isIncremental) {
            endpoint = '/crm/v3/objects/deals/search';
            method = 'post';
            paramsOrData = {
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
                properties: requiredProperties,
                limit: limit
            };
        } else {
            endpoint = '/crm/v3/objects/deals';
            method = 'get';
            paramsOrData = {
                properties: requiredProperties.join(','),
                limit: limit
            };
        }

        for await (const page of paginateHubSpot<Deal>(nango, endpoint, paramsOrData, method)) {
            allDeals.push(...page);
        }

        await nango.batchSave<Deal>(allDeals, 'Deal');

        await nango.log('Successfully fetched and saved deals', {
            total: allDeals.length
        });
    } catch (error) {
        await nango.log('Error fetching deals', { error });
        throw error;
    }
}
