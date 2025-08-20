import { createSync } from 'nango';
import type { DatasetDataResponse } from '../types.js';
import { toStandardEmployee } from '../mappers/to-standard-employee.js';

import type { ProxyConfiguration } from 'nango';
import { StandardEmployee } from '../models.js';
import { z } from 'zod';

interface DatasetRequestData {
    fields?: string[];
    filters?: {
        lastChanged?: {
            includeNull: string;
            value?: string;
        };
    };
}

const sync = createSync({
    description: 'Fetches a list of current employees from bamboohr and maps them to the standard HRIS model using the employee dataset',
    version: '1.0.0',
    frequency: 'every 6 hours',
    autoStart: true,
    syncType: 'incremental',
    trackDeletes: false,

    endpoints: [
        {
            method: 'POST',
            path: '/employees/unified/sync',
            group: 'Unified HRIS API'
        }
    ],

    models: {
        StandardEmployee: StandardEmployee
    },

    metadata: z.object({}),

    exec: async (nango) => {
        const datasetRequestData: DatasetRequestData = {
            fields: [
                'employeeNumber',
                'firstName',
                'lastName',
                'dateOfBirth',
                'addressLineOne',
                'email',
                'jobInformationJobTitle',
                'hireDate',
                'supervisorId',
                'supervisorName',
                'createdByUserId',
                'jobInformationDepartment',
                'jobInformationDivision',
                'employmentStatus',
                'gender',
                'country',
                'city',
                'jobInformationLocation',
                'state',
                'maritalStatus',
                'payBand',
                'compensationPayType',
                'compensationPaySchedule',
                'workPhone',
                'homePhone'
            ]
            // Note: Incremental sync using lastChanged filter is not working as expected
            // The API may require a different approach for incremental syncs
            // For now, this will perform a full sync each time
        };

        const proxyConfig: ProxyConfiguration = {
            // https://documentation.bamboohr.com/reference/get-data-from-dataset-1
            endpoint: '/v1/datasets/employee',
            data: datasetRequestData,
            retries: 10
        };

        const response = await nango.post<DatasetDataResponse>(proxyConfig);

        const employees = response.data.data;
        const chunkSize = 100;

        for (let i = 0; i < employees.length; i += chunkSize) {
            const chunk = employees.slice(i, i + chunkSize);
            const mappedEmployees = chunk.map(toStandardEmployee);
            const batchSize = mappedEmployees.length;

            await nango.log(`Saving batch of ${batchSize} unified employee(s)`);
            await nango.batchSave(mappedEmployees, 'StandardEmployee');
        }

        await nango.log(`Total unified employee(s) processed: ${employees.length}`);
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
