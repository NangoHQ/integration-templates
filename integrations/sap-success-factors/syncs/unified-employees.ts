import { createSync } from 'nango';
import type { SapSuccessFactorsComprehensiveEmployee } from '../types.js';
import { toStandardEmployee } from '../mappers/to-standard-employee.js';

import type { ProxyConfiguration } from 'nango';
import { StandardEmployee } from '../models.js';
import { z } from 'zod';

const sync = createSync({
    description: 'Fetches a list of current employees from  sap success factors and maps them to the standard HRIS model',
    version: '2.0.0',
    frequency: 'every hour',
    autoStart: true,
    syncType: 'incremental',
    trackDeletes: false,

    endpoints: [
        {
            method: 'GET',
            path: '/employees/unified',
            group: 'Employees'
        }
    ],

    models: {
        StandardEmployee: StandardEmployee
    },

    metadata: z.object({}),

    exec: async (nango) => {
        const lastModifiedDate = nango.lastSyncDate?.toISOString();

        const config: ProxyConfiguration = {
            // https://help.sap.com/docs/successfactors-platform/sap-successfactors-api-reference-guide-odata-v2/perperson
            endpoint: `/odata/v2/PerPerson`,
            params: {
                $format: 'json',
                $expand:
                    'personalInfoNav,personEmpTerminationInfoNav,phoneNav,emailNav,homeAddressNavDEFLT,employmentNav,personTypeUsageNav,employmentNav/compInfoNav,employmentNav/compInfoNav/employmentNav/jobInfoNav,employmentNav/compInfoNav/employmentNav/jobInfoNav/employmentTypeNav,employmentNav/compInfoNav/employmentNav/jobInfoNav/managerEmploymentNav,employmentNav/compInfoNav/employmentNav/jobInfoNav/managerEmploymentNav/personNav,employmentNav/compInfoNav/employmentNav/jobInfoNav/managerEmploymentNav/personNav/personalInfoNav,employmentNav/compInfoNav/employmentNav/jobInfoNav/locationNav,employmentNav/compInfoNav/employmentNav/jobInfoNav/departmentNav,employmentNav/compInfoNav/employmentNav/jobInfoNav/locationNav/addressNavDEFLT,employmentNav/compInfoNav/employmentNav/jobInfoNav/managerEmploymentNav/personNav/personalInfoNav/personNav,employmentNav/compInfoNav/employmentNav/jobInfoNav/managerEmploymentNav/personNav/personalInfoNav/personNav/emailNav,employmentNav/compInfoNav/employmentNav/jobInfoNav/regularTempNav,emailNav/emailTypeNav,phoneNav/phoneTypeNav,employmentNav/compInfoNav/employmentNav/jobInfoNav/managerEmploymentNav/personNav/emailNav,employmentNav/compInfoNav/employmentNav/jobInfoNav/emplStatusNav',
                ...(lastModifiedDate && {
                    $filter: `lastModifiedDateTime gt '${lastModifiedDate}' or personalInfoNav/lastModifiedDateTime gt '${lastModifiedDate}' or phoneNav/lastModifiedDateTime gt '${lastModifiedDate}' or employmentNav/lastModifiedDateTime gt '${lastModifiedDate}' or employmentNav/compInfoNav/lastModifiedDateTime gt '${lastModifiedDate}' or employmentNav/compInfoNav/employmentNav/lastModifiedDateTime gt '${lastModifiedDate}' or employmentNav/compInfoNav/employmentNav/jobInfoNav/lastModifiedDateTime gt '${lastModifiedDate}' or employmentNav/compInfoNav/employmentNav/jobInfoNav/departmentNav/lastModifiedDateTime gt '${lastModifiedDate}' or employmentNav/compInfoNav/employmentNav/jobInfoNav/managerEmploymentNav/lastModifiedDateTime gt '${lastModifiedDate}' or employmentNav/compInfoNav/employmentNav/jobInfoNav/managerEmploymentNav/personNav/lastModifiedDateTime gt '${lastModifiedDate}' or employmentNav/compInfoNav/employmentNav/jobInfoNav/managerEmploymentNav/personNav/personalInfoNav/lastModifiedDateTime gt '${lastModifiedDate}' or employmentNav/compInfoNav/employmentNav/jobInfoNav/managerEmploymentNav/personNav/personalInfoNav/personNav/lastModifiedDateTime gt '${lastModifiedDate}' or employmentNav/compInfoNav/employmentNav/jobInfoNav/managerEmploymentNav/personNav/personalInfoNav/personNav/emailNav/lastModifiedDateTime gt '${lastModifiedDate}' or employmentNav/compInfoNav/employmentNav/jobInfoNav/managerEmploymentNav/personNav/emailNav/lastModifiedDateTime gt '${lastModifiedDate}' or employmentNav/compInfoNav/employmentNav/jobInfoNav/locationNav/lastModifiedDateTime gt '${lastModifiedDate}' or employmentNav/compInfoNav/employmentNav/jobInfoNav/locationNav/addressNavDEFLT/lastModifiedDateTime gt '${lastModifiedDate}' or emailNav/lastModifiedDateTime gt '${lastModifiedDate}' or homeAddressNavDEFLT/lastModifiedDateTime gt '${lastModifiedDate}'`
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
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
