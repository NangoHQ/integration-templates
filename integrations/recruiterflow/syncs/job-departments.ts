import type { NangoSync, RecruiterFlowJobDepartment, ProxyConfiguration } from '../../models';

export default async function fetchData(nango: NangoSync): Promise<void> {
    const proxyConfig: ProxyConfiguration = {
        // https://recruiterflow.com/api#/Job%20APIs/get_api_external_job_department_list
        endpoint: '/api/external/job/department/list',
        retries: 10
    };

    const response = await nango.get<{ data: RecruiterFlowJobDepartment[] }>(proxyConfig);
    const departments = response.data.data;

    await nango.batchSave(departments, 'RecruiterFlowJobDepartment');
}
