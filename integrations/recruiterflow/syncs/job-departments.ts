import type { NangoSync, ProxyConfiguration, RecruiterFlowJobDepartment } from '../../models';
import type { RecruiterFlowJobDepartmentResponse } from '../types';

export default async function fetchData(nango: NangoSync): Promise<void> {
    const proxyConfig: ProxyConfiguration = {
        // https://recruiterflow.com/api#/Job%20APIs/get_api_external_job_department_list
        endpoint: '/api/external/job/department/list',
        retries: 10
    };

    const response = await nango.get<RecruiterFlowJobDepartmentResponse[]>(proxyConfig);
    const departments = response.data;

    await nango.batchSave(departments.map(toJobDepartment), 'RecruiterFlowJobDepartment');
}

function toJobDepartment(record: RecruiterFlowJobDepartmentResponse): RecruiterFlowJobDepartment {
    return {
        id: record.id,
        name: record.name,
        created_at: record.created_at,
        updated_at: record.updated_at
    };
}
