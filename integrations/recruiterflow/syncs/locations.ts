import type { NangoSync, ProxyConfiguration, RecruiterFlowLocation } from '../../models';
import type { RecruiterFlowLocationResponse } from '../types';

export default async function fetchData(nango: NangoSync): Promise<void> {
    const proxyConfig: ProxyConfiguration = {
        // https://recruiterflow.com/api#/Job%20APIs/get_api_external_location_list
        endpoint: '/api/external/location/list',
        retries: 10
    };

    const response = await nango.get<RecruiterFlowLocationResponse[]>(proxyConfig);
    const locations = response.data;

    await nango.batchSave(locations.map(toLocation), 'RecruiterFlowLocation');
}

function toLocation(record: RecruiterFlowLocationResponse): RecruiterFlowLocation {
    return {
        id: record.id,
        name: record.name,
        created_at: record.created_at,
        updated_at: record.updated_at
    };
}
