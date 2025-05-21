import type { NangoSync, RecruiterFlowJobRemoteStatus, ProxyConfiguration } from '../../models';
import type { RecruiterFlowJobRemoteStatusResponse } from '../types';

export default async function fetchData(nango: NangoSync): Promise<void> {
    const proxyConfig: ProxyConfiguration = {
        // https://recruiterflow.com/api#/Job%20APIs/get_api_external_job_remote_status_list
        endpoint: '/api/external/job-remote-status/list',
        retries: 10
    };

    const response = await nango.get<{ data: RecruiterFlowJobRemoteStatusResponse[] }>(proxyConfig);
    const remoteStatuses = response.data.data;

    await nango.batchSave(remoteStatuses.map(toJobRemoteStatus), 'RecruiterFlowJobRemoteStatus');
}

function toJobRemoteStatus(record: RecruiterFlowJobRemoteStatusResponse): RecruiterFlowJobRemoteStatus {
    return {
        id: record.id,
        name: record.name
    };
}
