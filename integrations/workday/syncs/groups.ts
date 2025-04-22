import type { NangoSync, Group } from '../../models';
import { jobFamilyToDepartment } from '../mappers/jobFamilyToGroup.js';
import type { ResponseGet_Job_FamiliesAsync } from '../types';
import { getSoapClient } from '../utils.js';

export default async function fetchData(nango: NangoSync): Promise<void> {
    const connection = await nango.getConnection();

    const client = await getSoapClient('Human_Resources', connection);

    let page = 1; // page starts at 1
    let hasMoreData = true;
    const records: Group[] = [];

    do {
        await nango.log('Fetching families', { page });

        // https://community.workday.com/sites/default/files/file-hosting/productionapi/Human_Resources/v44.0/Get_Job_Families.html
        const [res]: [ResponseGet_Job_FamiliesAsync, string] = await client['Get_Job_FamiliesAsync']({
            Response_Filter: {
                Page: page,
                Count: 50
            }
        });

        hasMoreData = res.Response_Results.Page < res.Response_Results.Total_Pages;
        page += 1;

        await nango.log('Received', {
            hasMoreData,
            count: res.Response_Results.Page_Results
        });

        for (const family of res.Response_Data.Job_Family) {
            const department = jobFamilyToDepartment(family, nango);
            if (department) {
                records.push(department);
            }
        }
    } while (hasMoreData);

    await nango.log('Saving records', { count: records.length });
    await nango.batchSave(records, 'Group');
}
