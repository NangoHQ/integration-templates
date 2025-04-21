import type { NangoSync, Employee } from '../../models';
import { workerToEmployee } from '../mappers/workerToEmployee.js';
import type { ResponseGet_WorkersAsync } from '../types';
import { getSoapClient } from '../utils.js';

export default async function fetchData(nango: NangoSync): Promise<void> {
    const connection = await nango.getConnection();
    const client = await getSoapClient('Staffing', connection);

    let page = 1;
    let hasMoreData = true;

    do {
        await nango.log(`Fetching page ${page}`);

        // https://community.workday.com/sites/default/files/file-hosting/productionapi/Staffing/v44.0/Get_Workers.html
        const [res]: [ResponseGet_WorkersAsync, string] = await client['Get_WorkersAsync']({
            Response_Filter: {
                Page: page,
                Count: 50
            },
            Request_Criteria: {
                Exclude_Contingent_Workers: true
            }
        });

        hasMoreData = res.Response_Results.Page < res.Response_Results.Total_Pages;
        page += 1;

        await nango.log(
            `Received ${res.Response_Results.Page_Results} workers, page ${res.Response_Results.Page} of ${res.Response_Results.Total_Pages} (${res.Response_Results.Total_Results} total)`
        );

        const workers = res.Response_Data?.Worker ?? [];
        const records: Employee[] = [];

        for (const worker of workers) {
            const employee = await workerToEmployee(worker, nango);
            if (employee) {
                records.push(employee);
            }
        }

        if (records.length > 0) {
            await nango.batchSave(records, 'Employee');
        }
    } while (hasMoreData);
}
