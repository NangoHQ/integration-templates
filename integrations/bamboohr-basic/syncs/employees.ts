import type { NangoSync, ProxyConfiguration, BamboohrEmployee } from '../../models.js';
import type { BamboohrEmployeeResponse } from '../types.js';
import { toEmployee } from '../mappers/to-employee.js';

interface CustomReportData {
    title: string;
    filters: {
        lastChanged: {
            includeNull: string;
            value?: string;
        };
    };
    fields: (keyof BamboohrEmployee)[];
}

export default async function fetchData(nango: NangoSync) {
    const customReportData: CustomReportData = {
        title: 'Current Employees',
        filters: {
            lastChanged: {
                includeNull: 'no',
                ...(nango.lastSyncDate ? { value: nango.lastSyncDate?.toISOString().split('.')[0] + 'Z' } : {}) //remove milliseconds
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
            'ssn',
            'workPhone',
            'homePhone'
        ]
    };

    const proxyConfig: ProxyConfiguration = {
        // https://documentation.bamboohr.com/reference/request-custom-report-1
        endpoint: '/v1/reports/custom',
        params: {
            format: 'JSON',
            onlyCurrent: true.toString() //limits the report to only current employees
        },
        data: customReportData,
        retries: 10
    };

    const response = await nango.post<BamboohrEmployeeResponse>(proxyConfig);

    const employees = response.data.employees;
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
