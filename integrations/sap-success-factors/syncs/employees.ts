import type { NangoSync, ProxyConfiguration } from '../../models.js';
import type { SapSuccessFactorsPerPerson } from '../types.js';

export default async function fetchData(nango: NangoSync) {
    // API Docs: https://help.sap.com/docs/SAP_SUCCESSFACTORS_PLATFORM/d599f15995d348a1b45ba5fa5a27342c/LATEST/get-perperson-latest.html
    const fields = [
        'personIdExternal',
        'userId',
        'perPersonUuid',
        'personId',
        'dateOfBirth',
        'countryOfBirth',
        'regionOfBirth',
        'birthName',
        'createdDateTime',
        'lastModifiedDateTime'
    ].join(',');

    const expand = ['personalInfoNav', 'emailNav', 'phoneNav', 'homeAddressNavDEFLT'].join(',');

    const config: ProxyConfiguration = {
        // https://api.sap.com/api/ECPersonalInformation/path/get_PerPerson
        endpoint: '/PerPerson',
        params: {
            $select: fields,
            $expand: expand,
            $format: 'json'
        },
        paginate: {
            type: 'offset',
            offset_calculation_method: 'per-page',
            offset_name_in_request: 'skip',
            offset_start_value: 0,
            limit: 100,
            limit_name_in_request: 'top',
            response_path: 'd.results'
        },
        retries: 10
    };

    for await (const records of nango.paginate<SapSuccessFactorsPerPerson>(config)) {
        const mappedRecords = records.map((record) => ({
            id: record.perPersonUuid,
            ...record
        }));
        await nango.batchSave(mappedRecords, 'SapSuccessFactorsEmployee');
    }
}
