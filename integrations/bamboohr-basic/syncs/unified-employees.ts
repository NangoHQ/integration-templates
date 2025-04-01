import type { NangoSync, ProxyConfiguration } from '../../models.js';
import type { BamboohrEmployeeResponse } from '../types.js';
import { toStandardEmployee } from '../mappers/to-standard-employee.js';

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

export default async function fetchData(nango: NangoSync) {
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
