import type { NangoSync, RecruiterFlowLocation } from '../../models';
import type { RecruiterFlowLocationResponse } from '../types';

export default async function fetchData(nango: NangoSync): Promise<void> {
    const proxyConfig = {
        endpoint: '/api/external/location/list',
        retries: 10
    };

    const response = await nango.get(proxyConfig);
    const locations = response.data as RecruiterFlowLocationResponse[];

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