import type { NangoSync, RecruiterFlowLocation, ProxyConfiguration } from '../../models';
import type { RecruiterFlowLocationResponse } from '../types';

export default async function fetchData(nango: NangoSync): Promise<void> {
    const proxyConfig: ProxyConfiguration = {
        // https://recruiterflow.com/api#/Job%20APIs/get_api_external_location_list
        endpoint: '/api/external/location/list',
        retries: 10
    };

    const response = await nango.get<{ data: RecruiterFlowLocationResponse[] }>(proxyConfig);
    const locations = response.data.data;

    await nango.batchSave(locations.map(toLocation), 'RecruiterFlowLocation');
}

function toLocation(record: RecruiterFlowLocationResponse): RecruiterFlowLocation {
    return {
        id: record.id,
        name: record.name,
        city: record.city || undefined,
        country: record.country || undefined,
        details: record.details || undefined,
        iso_3166_1_alpha_2_code: record.iso_3166_1_alpha_2_code || undefined,
        location_type: record.location_type,
        location_type_id: record.location_type_id,
        postal_code: record.postal_code || undefined,
        state: record.state || undefined,
        zipcode: record.zipcode || undefined
    };
}
