import { createSync } from 'nango';
import type { SapSuccessFactorsComprehensiveEmployee } from '../types.js';
import { toStandardEmployee } from '../mappers/to-standard-employee.js';
import { assertFilterPathsExpanded, buildModifiedAfterFilter } from '../helpers/utils.js';

import type { ProxyConfiguration } from 'nango';
import { StandardEmployee } from '../models.js';
import { z } from 'zod';

const CheckpointSchema = z.object({
    updated_after: z.string()
});

const EXPAND =
    'personalInfoNav,personEmpTerminationInfoNav,phoneNav,emailNav,homeAddressNavDEFLT,employmentNav,personTypeUsageNav,employmentNav/compInfoNav,employmentNav/compInfoNav/employmentNav/jobInfoNav,employmentNav/compInfoNav/employmentNav/jobInfoNav/employmentTypeNav,employmentNav/compInfoNav/employmentNav/jobInfoNav/managerEmploymentNav,employmentNav/compInfoNav/employmentNav/jobInfoNav/managerEmploymentNav/personNav,employmentNav/compInfoNav/employmentNav/jobInfoNav/managerEmploymentNav/personNav/personalInfoNav,employmentNav/compInfoNav/employmentNav/jobInfoNav/locationNav,employmentNav/compInfoNav/employmentNav/jobInfoNav/departmentNav,employmentNav/compInfoNav/employmentNav/jobInfoNav/locationNav/addressNavDEFLT,employmentNav/compInfoNav/employmentNav/jobInfoNav/managerEmploymentNav/personNav/personalInfoNav/personNav,employmentNav/compInfoNav/employmentNav/jobInfoNav/managerEmploymentNav/personNav/personalInfoNav/personNav/emailNav,employmentNav/compInfoNav/employmentNav/jobInfoNav/regularTempNav,emailNav/emailTypeNav,phoneNav/phoneTypeNav,employmentNav/compInfoNav/employmentNav/jobInfoNav/managerEmploymentNav/personNav/emailNav,employmentNav/compInfoNav/employmentNav/jobInfoNav/emplStatusNav';

/**
 * `toStandardEmployee` reads from every nav property below, and SAP does not reliably
 * cascade nested-record edits into PerPerson's own `lastModifiedDateTime`. Each expanded
 * nav property therefore needs its own clause or nested-only changes are silently missed.
 */
const MODIFIED_PATHS = [
    'lastModifiedDateTime',
    'personalInfoNav/lastModifiedDateTime',
    'phoneNav/lastModifiedDateTime',
    'employmentNav/lastModifiedDateTime',
    'employmentNav/compInfoNav/lastModifiedDateTime',
    'employmentNav/compInfoNav/employmentNav/lastModifiedDateTime',
    'employmentNav/compInfoNav/employmentNav/jobInfoNav/lastModifiedDateTime',
    'employmentNav/compInfoNav/employmentNav/jobInfoNav/departmentNav/lastModifiedDateTime',
    'employmentNav/compInfoNav/employmentNav/jobInfoNav/managerEmploymentNav/lastModifiedDateTime',
    'employmentNav/compInfoNav/employmentNav/jobInfoNav/managerEmploymentNav/personNav/lastModifiedDateTime',
    'employmentNav/compInfoNav/employmentNav/jobInfoNav/managerEmploymentNav/personNav/personalInfoNav/lastModifiedDateTime',
    'employmentNav/compInfoNav/employmentNav/jobInfoNav/managerEmploymentNav/personNav/personalInfoNav/personNav/lastModifiedDateTime',
    'employmentNav/compInfoNav/employmentNav/jobInfoNav/managerEmploymentNav/personNav/personalInfoNav/personNav/emailNav/lastModifiedDateTime',
    'employmentNav/compInfoNav/employmentNav/jobInfoNav/managerEmploymentNav/personNav/emailNav/lastModifiedDateTime',
    'employmentNav/compInfoNav/employmentNav/jobInfoNav/locationNav/lastModifiedDateTime',
    'employmentNav/compInfoNav/employmentNav/jobInfoNav/locationNav/addressNavDEFLT/lastModifiedDateTime',
    'emailNav/lastModifiedDateTime',
    'homeAddressNavDEFLT/lastModifiedDateTime'
];

const sync = createSync({
    description: 'Fetches a list of current employees from  sap success factors and maps them to the standard HRIS model',
    version: '2.2.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,

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
        const rawCheckpoint = await nango.getCheckpoint();
        const checkpoint = rawCheckpoint ? CheckpointSchema.parse(rawCheckpoint) : undefined;
        const checkpointUpdatedAfter = checkpoint?.updated_after ? new Date(checkpoint.updated_after) : undefined;
        const runStartedAt = new Date().toISOString();

        assertFilterPathsExpanded(MODIFIED_PATHS, EXPAND);

        const config: ProxyConfiguration = {
            // https://help.sap.com/docs/successfactors-platform/sap-successfactors-api-reference-guide-odata-v2/perperson
            endpoint: `/odata/v2/PerPerson`,
            params: {
                $format: 'json',
                $expand: EXPAND,
                ...(checkpointUpdatedAfter && {
                    $filter: buildModifiedAfterFilter(MODIFIED_PATHS, checkpointUpdatedAfter)
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

        let recordsSaved = 0;
        for await (const records of nango.paginate<SapSuccessFactorsComprehensiveEmployee>(config)) {
            const mappedRecords = await Promise.all(records.map((person) => toStandardEmployee(person, nango)));
            await nango.batchSave(mappedRecords, 'StandardEmployee');
            recordsSaved += mappedRecords.length;
        }

        await nango.log(
            `unified-employees: advancing checkpoint ${checkpointUpdatedAfter?.toISOString() ?? 'none (full sync)'} -> ${runStartedAt} (${recordsSaved} records)`
        );
        await nango.saveCheckpoint({ updated_after: runStartedAt });
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
