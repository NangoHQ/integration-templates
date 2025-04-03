import type { NangoSync, ProxyConfiguration } from '../../models.js';
import { toHibobEmployee } from '../mappers/to-hibob-employee.js';

export default async function fetchData(nango: NangoSync) {
    const proxyConfig: ProxyConfiguration = {
        // https://api.hibob.com/v1/people/search
        endpoint: '/v1/people/search',
        data: {},
        retries: 10
    };

    const response = await nango.post(proxyConfig);
    const employees = response.data.employees;
    const chunkSize = 100;

    for (let i = 0; i < employees.length; i += chunkSize) {
        const chunk = employees.slice(i, i + chunkSize);
        const mappedEmployees = toHibobEmployee(chunk);
        const batchSize = mappedEmployees.length;

        await nango.log(`Saving batch of ${batchSize} employee(s)`);
        await nango.batchSave(mappedEmployees, 'HibobEmployee');
    }

    await nango.log(`Total employee(s) processed: ${employees.length}`);
}
