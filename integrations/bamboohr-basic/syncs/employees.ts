import { createSync } from 'nango';
import type { DatasetDataResponse } from '../types.js';
import { toEmployee } from '../mappers/to-employee.js';

import type { ProxyConfiguration } from 'nango';
import { BamboohrEmployee } from '../models.js';
import { z } from 'zod';

interface DatasetRequestData {
    fields?: string[];
    filters?: {
        match: string;
        filters: { field: string; operator: string; value: string }[];
    };
}

const sync = createSync({
    description: 'Fetches a list of current employees from bamboohr using the employee dataset',
    version: '2.0.0',
    frequency: 'every 6 hours',
    autoStart: true,
    syncType: 'incremental',
    trackDeletes: false,

    endpoints: [
        {
            method: 'GET',
            path: '/employees',
            group: 'Employees'
        }
    ],

    models: {
        BamboohrEmployee: BamboohrEmployee
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
            const mappedEmployees = toEmployee(chunk);
            const batchSize = mappedEmployees.length;

            await nango.log(`Saving batch of ${batchSize} employee(s)`);
            await nango.batchSave(mappedEmployees, 'BamboohrEmployee');
        }

        await nango.log(`Total employee(s) processed: ${employees.length}`);
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
