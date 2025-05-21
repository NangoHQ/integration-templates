import type { NangoSync, ProxyConfiguration, RecruiterFlowEmploymentType } from '../../models';
import type { RecruiterFlowEmploymentTypeResponse } from '../types';

export default async function fetchData(nango: NangoSync): Promise<void> {
    const proxyConfig: ProxyConfiguration = {
        // https://recruiterflow.com/api#/Other%20APIs/get_api_external_organization_employment_type_list
        endpoint: '/organization/employment-type/list',
        retries: 10
    };

    const response = await nango.get<RecruiterFlowEmploymentTypeResponse[]>(proxyConfig);
    const employmentTypes = response.data;

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
