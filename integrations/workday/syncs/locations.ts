import type { NangoSync, Location } from '../../models';
import { locationToLocation } from '../mappers/locationToLocation.js';
import type { ResponseGet_LocationsAsync } from '../types';
import { getSoapClient } from '../utils.js';

export default async function fetchData(nango: NangoSync): Promise<void> {
    const connection = await nango.getConnection();

    const client = await getSoapClient('Human_Resources', connection);

    let page = 1; // page starts at 1
    let hasMoreData = true;
    const records: Location[] = [];

    do {
        await nango.log('Fetching locations', { page });

        // https://community.workday.com/sites/default/files/file-hosting/productionapi/Human_Resources/v44.0/Get_Locations.html
        const [res]: [ResponseGet_LocationsAsync, string] = await client['Get_LocationsAsync']({
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

        for (const location of res.Response_Data.Location) {
            const employee = await locationToLocation(location, nango);
            if (employee) {
                records.push(employee);
            }
        }
    } while (hasMoreData);

    await nango.log('Saving records', { count: records.length });
    await nango.batchSave(records, 'Location');
}
