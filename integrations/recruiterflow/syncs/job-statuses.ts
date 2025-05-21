import type { NangoSync, ProxyConfiguration, RecruiterFlowJobStatus } from '../../models';
import type { RecruiterFlowJobStatusResponse } from '../types';

export default async function fetchData(nango: NangoSync): Promise<void> {
    const proxyConfig: ProxyConfiguration = {
        // https://recruiterflow.com/api#/Job%20APIs/get_api_external_job_status_list
        endpoint: '/api/external/job-status/list',
        retries: 10
    };

    const response = await nango.get<RecruiterFlowJobStatusResponse[]>(proxyConfig);
    const statuses = response.data;

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
