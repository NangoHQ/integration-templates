import { createSync } from 'nango';
import { workerToEmployee } from '../mappers/workerToEmployee.js';
import type { ResponseGet_WorkersAsync } from '../types.js';
import { getSoapClient } from '../utils.js';
import { getIncrementalDateRange } from '../helpers/timeUtils.js';

import { Employee, SyncConfiguration } from '../models.js';

const sync = createSync({
    description: 'Fetches a list of current employees from Workday',
    version: '2.0.0',
    frequency: 'every hour',
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
        Employee: Employee
    },

    metadata: SyncConfiguration,

    exec: async (nango) => {
        const connection = await nango.getConnection();
        const metadata: SyncConfiguration | null = connection.metadata;
        const client = await getSoapClient('Staffing', connection);
        let updatedFrom: string | undefined;
        let updatedThrough: string | undefined;

        if (nango.lastSyncDate) {
            ({ updatedFrom, updatedThrough } = getIncrementalDateRange(nango.lastSyncDate, metadata?.lagMinutes));
        }

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
                    Exclude_Contingent_Workers: true,
                    ...(updatedFrom && {
                        Transaction_Log_Criteria_Data: {
                            Transaction_Date_Range_Data: {
                                Updated_From: updatedFrom,
                                Updated_Through: updatedThrough
                            }
                        }
                    })
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
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
