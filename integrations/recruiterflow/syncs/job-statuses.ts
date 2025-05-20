import type { NangoSync, RecruiterFlowJobStatus } from '../../models';
import type { RecruiterFlowJobStatusResponse } from '../types';

export default async function fetchData(nango: NangoSync): Promise<void> {
    const proxyConfig = {
        endpoint: '/api/external/job/status/list',
        retries: 10
    };

    const response = await nango.get(proxyConfig);
    const statuses = response.data as RecruiterFlowJobStatusResponse[];

    await nango.batchSave(statuses.map(toJobStatus), 'RecruiterFlowJobStatus');
}

function toJobStatus(record: RecruiterFlowJobStatusResponse): RecruiterFlowJobStatus {
    return {
        id: record.id,
        name: record.name,
        created_at: record.created_at,
        updated_at: record.updated_at
    };
} 