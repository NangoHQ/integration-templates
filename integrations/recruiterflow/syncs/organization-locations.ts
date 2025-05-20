import type { NangoSync, RecruiterFlowOrganizationLocation } from '../../models';
import type { RecruiterFlowOrganizationLocationResponse } from '../types';

export default async function fetchData(nango: NangoSync): Promise<void> {
    const proxyConfig = {
        endpoint: '/api/external/organization/location/list',
        retries: 10
    };

    const response = await nango.get(proxyConfig);
    const locations = response.data as RecruiterFlowOrganizationLocationResponse[];

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
        postal_code: record.postal_code,
        created_at: record.created_at,
        updated_at: record.updated_at
    };
} 