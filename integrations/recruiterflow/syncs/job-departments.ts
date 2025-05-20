import type { NangoSync, RecruiterFlowJobDepartment } from '../../models';
import type { RecruiterFlowJobDepartmentResponse } from '../types';

export default async function fetchData(nango: NangoSync): Promise<void> {
    const proxyConfig = {
        endpoint: '/api/external/job/department/list',
        retries: 10
    };

    const response = await nango.get(proxyConfig);
    const departments = response.data as RecruiterFlowJobDepartmentResponse[];

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