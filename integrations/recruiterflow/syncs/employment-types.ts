import type { NangoSync, RecruiterFlowEmploymentType, ProxyConfiguration } from '../../models';

export default async function fetchData(nango: NangoSync): Promise<void> {
    const proxyConfig: ProxyConfiguration = {
        // https://recruiterflow.com/api#/Other%20APIs/get_api_external_organization_employment_type_list
        endpoint: '/api/external/organization/employment-type/list',
        retries: 10
    };

    const response = await nango.get<{ data: RecruiterFlowEmploymentType[] }>(proxyConfig);
    const employmentTypes = response.data.data;

    await nango.batchSave(employmentTypes, 'RecruiterFlowEmploymentType');
}
