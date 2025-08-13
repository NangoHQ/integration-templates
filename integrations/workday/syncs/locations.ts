import { createSync } from 'nango';
import { locationToLocation } from '../mappers/locationToLocation.js';
import type { ResponseGet_LocationsAsync } from '../types.js';
import { getSoapClient } from '../utils.js';

import { Location } from '../models.js';
import { z } from 'zod';

const sync = createSync({
    description: 'Fetches Company locations',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    syncType: 'full',
    trackDeletes: true,

    endpoints: [
        {
            method: 'GET',
            path: '/locations',
            group: 'Locations'
        }
    ],

    models: {
        Location: Location
    },

    metadata: z.object({}),

    exec: async (nango) => {
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
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
