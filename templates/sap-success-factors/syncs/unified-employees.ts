import { createSync } from "nango";
import type { SapSuccessFactorsComprehensiveEmployee } from '../types.js';
import { toStandardEmployee } from '../mappers/to-standard-employee.js';

import type { ProxyConfiguration } from "nango";
import { StandardEmployee } from "../models.js";
import { z } from "zod";

const sync = createSync({
    description: "Fetches a list of current employees from  sap success factors and maps them to the standard HRIS model",
    version: "2.0.0",
    frequency: "every hour",
    autoStart: true,
    syncType: "incremental",
    trackDeletes: false,

    endpoints: [{
        method: "GET",
        path: "/employees/unified",
        group: "Employees"
    }],

    models: {
        StandardEmployee: StandardEmployee
    },

    metadata: z.object({}),

    exec: async nango => {
        const config: ProxyConfiguration = {
            // https://help.sap.com/docs/successfactors-platform/sap-successfactors-api-reference-guide-odata-v2/perperson
            endpoint: `/odata/v2/PerPerson`,
            params: {
                $format: 'json',
                $expand:
                    'personalInfoNav,personEmpTerminationInfoNav,phoneNav,emailNav,homeAddressNavDEFLT,employmentNav,personTypeUsageNav,employmentNav/compInfoNav,employmentNav/compInfoNav/employmentNav/jobInfoNav,employmentNav/compInfoNav/employmentNav/jobInfoNav/employmentTypeNav,employmentNav/compInfoNav/employmentNav/jobInfoNav/managerEmploymentNav,employmentNav/compInfoNav/employmentNav/jobInfoNav/managerEmploymentNav/personNav,employmentNav/compInfoNav/employmentNav/jobInfoNav/managerEmploymentNav/personNav/personalInfoNav,employmentNav/compInfoNav/employmentNav/jobInfoNav/locationNav,employmentNav/compInfoNav/employmentNav/jobInfoNav/locationNav/addressNavDEFLT,employmentNav/compInfoNav/employmentNav/jobInfoNav/managerEmploymentNav/personNav/personalInfoNav/personNav,employmentNav/compInfoNav/employmentNav/jobInfoNav/managerEmploymentNav/personNav/personalInfoNav/personNav/emailNav,employmentNav/compInfoNav/employmentNav/jobInfoNav/regularTempNav',
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

        for await (const records of nango.paginate<SapSuccessFactorsComprehensiveEmployee>(config)) {
            const mappedRecords = records.map(toStandardEmployee);
            await nango.batchSave(mappedRecords, 'StandardEmployee');
        }
    }
});

export type NangoSyncLocal = Parameters<typeof sync["exec"]>[0];
export default sync;
