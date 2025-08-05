import type { NangoSync, ProxyConfiguration } from '../../models';
import type { SapSuccessFactorsComprehensiveEmployee } from '../types';
import { toStandardEmployee } from '../mappers/to-standard-employee.js';

export default async function fetchData(nango: NangoSync) {
    const config: ProxyConfiguration = {
        // https://help.sap.com/docs/successfactors-platform/sap-successfactors-api-reference-guide-odata-v2/perperson
        endpoint: `/odata/v2/PerPerson`,
        params: {
            $format: 'json',
            $expand:
                'personalInfoNav,personEmpTerminationInfoNav,phoneNav,emailNav,homeAddressNavDEFLT,employmentNav,personTypeUsageNav,employmentNav/compInfoNav,employmentNav/compInfoNav/employmentNav/jobInfoNav,employmentNav/compInfoNav/employmentNav/jobInfoNav/employmentTypeNav,employmentNav/compInfoNav/employmentNav/jobInfoNav/managerEmploymentNav,employmentNav/compInfoNav/employmentNav/jobInfoNav/managerEmploymentNav/personNav,employmentNav/compInfoNav/employmentNav/jobInfoNav/managerEmploymentNav/personNav/personalInfoNav,employmentNav/compInfoNav/employmentNav/jobInfoNav/locationNav,employmentNav/compInfoNav/employmentNav/jobInfoNav/departmentNav,employmentNav/compInfoNav/employmentNav/jobInfoNav/locationNav/addressNavDEFLT,employmentNav/compInfoNav/employmentNav/jobInfoNav/managerEmploymentNav/personNav/personalInfoNav/personNav,employmentNav/compInfoNav/employmentNav/jobInfoNav/managerEmploymentNav/personNav/personalInfoNav/personNav/emailNav,employmentNav/compInfoNav/employmentNav/jobInfoNav/regularTempNav,emailNav/emailTypeNav,phoneNav/phoneTypeNav,employmentNav/compInfoNav/employmentNav/jobInfoNav/managerEmploymentNav/personNav/emailNav,employmentNav/compInfoNav/employmentNav/jobInfoNav/emplStatusNav',
            ...(nango.lastSyncDate && {
                $filter: `lastModifiedDateTime gt '${nango.lastSyncDate.toISOString()}' or personalInfoNav/lastModifiedDateTime gt '${nango.lastSyncDate.toISOString()}' or phoneNav/lastModifiedDateTime gt '${nango.lastSyncDate.toISOString()}' or employmentNav/lastModifiedDateTime gt '${nango.lastSyncDate.toISOString()}' or employmentNav/compInfoNav/lastModifiedDateTime gt '${nango.lastSyncDate.toISOString()}' or employmentNav/compInfoNav/employmentNav/lastModifiedDateTime gt '${nango.lastSyncDate.toISOString()}' or employmentNav/compInfoNav/employmentNav/jobInfoNav/lastModifiedDateTime gt '${nango.lastSyncDate.toISOString()}' or employmentNav/compInfoNav/employmentNav/jobInfoNav/departmentNav/lastModifiedDateTime gt '${nango.lastSyncDate.toISOString()}' or employmentNav/compInfoNav/employmentNav/jobInfoNav/managerEmploymentNav/lastModifiedDateTime gt '${nango.lastSyncDate.toISOString()}' or employmentNav/compInfoNav/employmentNav/jobInfoNav/managerEmploymentNav/personNav/lastModifiedDateTime gt '${nango.lastSyncDate.toISOString()}' or employmentNav/compInfoNav/employmentNav/jobInfoNav/managerEmploymentNav/personNav/personalInfoNav/lastModifiedDateTime gt '${nango.lastSyncDate.toISOString()}' or employmentNav/compInfoNav/employmentNav/jobInfoNav/managerEmploymentNav/personNav/personalInfoNav/personNav/lastModifiedDateTime gt '${nango.lastSyncDate.toISOString()}' or employmentNav/compInfoNav/employmentNav/jobInfoNav/managerEmploymentNav/personNav/personalInfoNav/personNav/emailNav/lastModifiedDateTime gt '${nango.lastSyncDate.toISOString()}' or employmentNav/compInfoNav/employmentNav/jobInfoNav/managerEmploymentNav/personNav/emailNav/lastModifiedDateTime gt '${nango.lastSyncDate.toISOString()}' or employmentNav/compInfoNav/employmentNav/jobInfoNav/locationNav/lastModifiedDateTime gt '${nango.lastSyncDate.toISOString()}' or employmentNav/compInfoNav/employmentNav/jobInfoNav/locationNav/addressNavDEFLT/lastModifiedDateTime gt '${nango.lastSyncDate.toISOString()}' or emailNav/lastModifiedDateTime gt '${nango.lastSyncDate.toISOString()}' or homeAddressNavDEFLT/lastModifiedDateTime gt '${nango.lastSyncDate.toISOString()}'`
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

    for await (const records of nango.paginate<SapSuccessFactorsComprehensiveEmployee>(config)) {
        const mappedRecords = await Promise.all(records.map((person) => toStandardEmployee(person, nango)));
        await nango.batchSave(mappedRecords, 'StandardEmployee');
    }
}
