import type { NangoSync, ProxyConfiguration } from '../../models';
import type { SapSuccessFactorsPerPerson } from '../types.js';
import { toEmployee } from '../mappers/to-employee.js';

export default async function fetchData(nango: NangoSync) {
    const config: ProxyConfiguration = {
        // https://help.sap.com/docs/successfactors-platform/sap-successfactors-api-reference-guide-odata-v2/perperson
        endpoint: '/odata/v2/PerPerson',
        params: {
            $format: 'json',
            $expand: 'personalInfoNav',
            ...(nango.lastSyncDate && {
                $filter: `lastModifiedDateTime ge datetime'${nango.lastSyncDate.toISOString()}'`
            })
        },
        paginate: {
            type: 'offset',
            offset_calculation_method: 'by-response-size',
            offset_name_in_request: '$skip',
            offset_start_value: 0,
            limit: 100,
            limit_name_in_request: '$top',
            response_path: 'd.results'
        },
        retries: 10
    };

    for await (const records of nango.paginate<SapSuccessFactorsPerPerson>(config)) {
        const mappedRecords = records.map(toEmployee);
        await nango.batchSave(mappedRecords, 'Employee');
    }
}
