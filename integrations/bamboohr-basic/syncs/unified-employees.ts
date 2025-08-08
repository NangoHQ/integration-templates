import { createSync } from "nango";
import type { BamboohrEmployeeResponse } from '../types.js';
import { toStandardEmployee } from '../mappers/to-standard-employee.js';

import type { ProxyConfiguration } from "nango";
import { StandardEmployee } from "../models.js";
import { z } from "zod";

interface CustomReportData {
    title: string;
    filters: {
        lastChanged: {
            includeNull: string;
            value?: string;
        };
    };
    fields: string[];
}

const sync = createSync({
    description: "Fetches a list of current employees from bamboohr and maps them to the standard HRIS model",
    version: "1.0.0",
    frequency: "every 6 hours",
    autoStart: true,
    syncType: "incremental",
    trackDeletes: false,

    endpoints: [{
        method: "GET",
        path: "/employees/unified",
        group: "Unified HRIS API"
    }],

    models: {
        StandardEmployee: StandardEmployee
    },

    metadata: z.object({}),

    exec: async nango => {
        const customReportData: CustomReportData = {
            title: 'Current Employees',
            filters: {
                lastChanged: {
                    includeNull: 'no',
                    ...(nango.lastSyncDate ? { value: nango.lastSyncDate?.toISOString().split('.')[0] + 'Z' } : {})
                }
            },
            fields: [
                'id',
                'employeeNumber',
                'firstName',
                'lastName',
                'dateOfBirth',
                'address1',
                'bestEmail',
                'jobTitle',
                'hireDate',
                'supervisorId',
                'supervisor',
                'createdByUserId',
                'department',
                'division',
                'employmentHistoryStatus',
                'gender',
                'country',
                'city',
                'location',
                'state',
                'maritalStatus',
                'exempt',
                'payRate',
                'payType',
                'payPer',
                'workPhone',
                'homePhone'
            ]
        };

        const proxyConfig: ProxyConfiguration = {
            // https://documentation.bamboohr.com/reference/request-custom-report-1
            endpoint: '/v1/reports/custom',
            params: {
                format: 'JSON',
                onlyCurrent: true.toString()
            },
            data: customReportData,
            retries: 10
        };

        const response = await nango.post<BamboohrEmployeeResponse>(proxyConfig);

        const employees = response.data.employees;
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

export type NangoSyncLocal = Parameters<typeof sync["exec"]>[0];
export default sync;
