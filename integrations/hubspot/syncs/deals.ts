import type { NangoSync, Property } from '../../models';
import { paginateHubSpot } from '../helpers/paginateHubSpot';

export interface Deal {
    id: string;
    properties: { type: Record<string, any>; additionalProperties: true };
}

export default async function fetchDeals(nango: NangoSync): Promise<void> {
    try {
        const propertiesResponse = await nango.get<{ results: Property[] }>({
            endpoint: '/crm/v3/properties/deals',
            retries: 3
        });

        const propertyNames: string[] = propertiesResponse.data.results.map((property) => property.name);

        const params = {
            properties: propertyNames.join(','),
            limit: 100
        };

        const endpoint = '/crm/v3/objects/deals';

        const allDeals: Deal[] = [];

        for await (const page of paginateHubSpot<Deal>(nango, endpoint, params)) {
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
