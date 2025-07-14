import type { NangoSync, RecruiterFlowJobStatus, ProxyConfiguration } from '../../models.js';
import type { RecruiterFlowJobStatusResponse } from '../types.js';

export default async function fetchData(nango: NangoSync): Promise<void> {
    const proxyConfig: ProxyConfiguration = {
        // https://recruiterflow.com/api#/Job%20APIs/get_api_external_job_status_list
        endpoint: '/api/external/job-status/list',
        retries: 10
    };

    const response = await nango.get<{ data: RecruiterFlowJobStatusResponse[] }>(proxyConfig);
    const statuses = response.data.data;

    await nango.batchSave(statuses.map(toJobStatus), 'RecruiterFlowJobStatus');
}

function toJobStatus(record: RecruiterFlowJobStatusResponse): RecruiterFlowJobStatus {
    return {
        id: record.id,
        name: record.name,
        color: record.color
    };
}
