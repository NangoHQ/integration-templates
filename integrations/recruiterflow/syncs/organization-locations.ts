import type { NangoSync, RecruiterFlowOrganizationLocation, ProxyConfiguration } from '../../models';
import type { RecruiterFlowOrganizationLocationResponse } from '../types';

export default async function fetchData(nango: NangoSync): Promise<void> {
    const proxyConfig: ProxyConfiguration = {
        // https://recruiterflow.com/api#/Organization%20APIs/get_api_external_organization_location_list
        endpoint: '/api/external/organization/location/list',
        retries: 10
    };

    const response = await nango.get<{ data: RecruiterFlowOrganizationLocationResponse[] }>(proxyConfig);
    const locations = response.data.data;

    await nango.batchSave(locations.map(toOrganizationLocation), 'RecruiterFlowOrganizationLocation');
}

function toOrganizationLocation(record: RecruiterFlowOrganizationLocationResponse): RecruiterFlowOrganizationLocation {
    return {
        id: record.id,
        name: record.name,
        address: record.address,
        city: record.city,
        state: record.state,
        country: record.country,
        postal_code: record.postal_code
    };
}
