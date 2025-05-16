import type { NangoSync, ProxyConfiguration } from '../../models';
import type { AttioCompanyResponse } from '../types';
import { toCompany } from '../mappers/to-company.js';

export default async function fetchData(nango: NangoSync) {
    const config: ProxyConfiguration = {
        // https://docs.attio.com/rest-api/endpoint-reference/standard-objects/companies/list-company-records
        endpoint: '/v2/objects/companies/records/query',
        method: 'POST',
        retries: 10,
        data: {
            limit: 500,
            offset: 0
        },
        paginate: {
            type: 'offset',
            limit_name_in_request: 'limit',
            offset_name_in_request: 'offset',
            offset_start_value: 0,
            response_path: 'data'
        }
    };

    for await (const page of nango.paginate<AttioCompanyResponse>(config)) {
        const companies = page.map(toCompany);
        await nango.batchSave(companies, 'AttioCompany');
    }
}
