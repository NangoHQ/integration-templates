import type { NangoSync, RecruiterFlowEmploymentType } from '../../models';
import type { RecruiterFlowEmploymentTypeResponse } from '../types';

export default async function fetchData(nango: NangoSync): Promise<void> {
    const proxyConfig = {
        endpoint: '/organization/employment-type/list',
        retries: 10
    };

    const response = await nango.get(proxyConfig);
    const employmentTypes = response.data as RecruiterFlowEmploymentTypeResponse[];

    await nango.batchSave(employmentTypes.map(toEmploymentType), 'RecruiterFlowEmploymentType');
}

function toEmploymentType(record: RecruiterFlowEmploymentTypeResponse): RecruiterFlowEmploymentType {
    return {
        id: record.id,
        name: record.name,
        created_at: record.created_at,
        updated_at: record.updated_at
    };
} 