import type { NangoSync } from '../../models';
import type { ResponseGet_WorkersAsync } from '../types';
import { toStandardEmployee } from '../mappers/to-standard-employee.js';
import { getSoapClient } from '../utils.js';
import { getIncrementalDateRange } from '../helpers/timeUtils.js';

export default async function fetchData(nango: NangoSync): Promise<void> {
    const connection = await nango.getConnection();
    const client = await getSoapClient('Human_Resources', connection);

    let page = 1;
    let hasMoreData = true;
    let totalProcessed = 0;

    // Determine date range for incremental sync (only if this is not the first run)
    let updatedFrom: string | undefined;
    let updatedThrough: string | undefined;

    if (nango.lastSyncDate) {
        ({ updatedFrom, updatedThrough } = getIncrementalDateRange(nango.lastSyncDate));
    }

    do {
        await nango.log(`Fetching page ${page}`);

        // https://community.workday.com/sites/default/files/file-hosting/productionapi/Human_Resources/v44.0/Get_Workers.html
        const [res]: [ResponseGet_WorkersAsync, string] = await client['Get_WorkersAsync']({
            Response_Filter: {
                Page: page,
                Count: 100
            },
            Request_Criteria: {
                Exclude_Inactive_Workers: false,
                ...(updatedFrom && {
                    Transaction_Log_Criteria_Data: {
                        Transaction_Date_Range_Data: {
                            Updated_From: updatedFrom,
                            Updated_Through: updatedThrough
                        }
                    }
                })
            },
            Response_Group: {
                Include_Personal_Information: true,
                Include_Employment_Information: true,
                Include_Organizations: true,
                Include_Roles: true
            }
        });

        const workers = res.Response_Data?.Worker ?? [];

        if (workers.length > 0) {
            const mappedEmployees = workers.map(toStandardEmployee);
            await nango.batchSave(mappedEmployees, 'StandardEmployee');

            totalProcessed += workers.length;
            await nango.log(`Processed and saved batch of ${workers.length} workers. Total processed: ${totalProcessed}`);
        }

        hasMoreData = res.Response_Results.Page < res.Response_Results.Total_Pages;
        page++;

        await nango.log(`Processed page ${res.Response_Results.Page} of ${res.Response_Results.Total_Pages} (${res.Response_Results.Total_Results} total)`);
    } while (hasMoreData);

    await nango.log(`Sync completed. Total workers processed: ${totalProcessed}`);
}
