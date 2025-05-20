import type { NangoSync, RecruiterFlowJobRemoteStatus } from '../../models';
import type { RecruiterFlowJobRemoteStatusResponse } from '../types';

export default async function fetchData(nango: NangoSync): Promise<void> {
    const proxyConfig = {
        endpoint: '/api/external/job-remote-status/list',
        retries: 10
    };

    const response = await nango.get(proxyConfig);
    const remoteStatuses = response.data as RecruiterFlowJobRemoteStatusResponse[];

    await nango.batchSave(remoteStatuses.map(toJobRemoteStatus), 'RecruiterFlowJobRemoteStatus');
}

function toJobRemoteStatus(record: RecruiterFlowJobRemoteStatusResponse): RecruiterFlowJobRemoteStatus {
    return {
        id: record.id,
        name: record.name,
        created_at: record.created_at,
        updated_at: record.updated_at
    };
} 