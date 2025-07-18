import type { NangoSync, ProxyConfiguration } from '../../models.js';
import type { SapSuccessFactorsLocation } from '../types.js';
import { toLocation } from '../mappers/to-location.js';

export default async function fetchData(nango: NangoSync) {
    const config: ProxyConfiguration = {
        // https://help.sap.com/docs/successfactors-platform/sap-successfactors-api-reference-guide-odata-v2/folocation
        endpoint: '/odata/v2/FOLocation',
        params: {
            $expand: 'addressNavDEFLT',
            $format: 'json',
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

    for await (const records of nango.paginate<SapSuccessFactorsLocation>(config)) {
        const mappedRecords = records.map(toLocation);
        await nango.batchSave(mappedRecords, 'Location');
    }
}
