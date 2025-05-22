import type { NangoSync, RecruiterFlowLeanJobStageName, ProxyConfiguration } from '../../models';

export default async function fetchData(nango: NangoSync): Promise<void> {
    const proxyConfig: ProxyConfiguration = {
        // https://recruiterflow.com/api#/Job%20APIs/get_api_external_job_stage_names
        endpoint: '/api/external/job/stage_names',
        retries: 10
    };

    const response = await nango.get<{ data: string[] }>(proxyConfig);
    const stages = response.data.data;

    await nango.batchSave(stages.map(toJobStageName), 'RecruiterFlowLeanJobStageName');
}

function toJobStageName(record: string): RecruiterFlowLeanJobStageName {
    return {
        id: record,
        name: record
    };
}
