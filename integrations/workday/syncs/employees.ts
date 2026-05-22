import { createSync } from 'nango';
import { workerToEmployee } from '../mappers/workerToEmployee.js';
import type { ResponseGet_WorkersAsync } from '../types.js';
import { getSoapClient } from '../utils.js';
import { getIncrementalDateRange } from '../helpers/timeUtils.js';

import { Employee, SyncConfiguration } from '../models.js';

import { z } from 'zod';
const CheckpointSchema = z.object({
    updated_from: z.string(),
    updated_through: z.string(),
    page: z.number()
});

const sync = createSync({
    description: 'Fetches a list of current employees from Workday',
    version: '2.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,

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
        const rawCheckpoint = await nango.getCheckpoint();
        const checkpoint = rawCheckpoint ? CheckpointSchema.parse(rawCheckpoint) : undefined;
        const runStartedAt = new Date().toISOString();
        const connection = await nango.getConnection();
        const metadata: SyncConfiguration | null = connection.metadata;
        const client = await getSoapClient('Staffing', connection);
        let updatedFrom: string | undefined;
        let updatedThrough: string | undefined;

        if (checkpoint?.updated_through) {
            updatedFrom = checkpoint.updated_from;
            updatedThrough = checkpoint.updated_through;
        } else if (checkpoint?.updated_from) {
            ({ updatedFrom, updatedThrough } = getIncrementalDateRange(checkpoint.updated_from, metadata?.lagMinutes));
        }

        let page = checkpoint?.page ?? 1;
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

            if (hasMoreData) {
                await nango.saveCheckpoint({
                    updated_from: updatedFrom ?? '',
                    updated_through: updatedThrough ?? '',
                    page
                });
            }
        } while (hasMoreData);

        await nango.saveCheckpoint({ updated_from: updatedThrough ?? runStartedAt, updated_through: '', page: 1 });
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
