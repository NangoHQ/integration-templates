import { createSync } from 'nango';
import type { RecruiterFlowOrganizationLocationResponse } from '../types.js';

import type { ProxyConfiguration } from 'nango';
import { RecruiterFlowOrganizationLocation } from '../models.js';
import { z } from 'zod';

const sync = createSync({
    description: 'Syncs all organization locations from RecruiterFlow',
    version: '2.0.0',
    frequency: 'every hour',
    autoStart: true,
    syncType: 'full',

    endpoints: [
        {
            method: 'GET',
            path: '/organization-locations',
            group: 'Organizations'
        }
    ],

    models: {
        RecruiterFlowOrganizationLocation: RecruiterFlowOrganizationLocation
    },

    metadata: z.object({}),

    exec: async (nango) => {
        const proxyConfig: ProxyConfiguration = {
            // https://recruiterflow.com/api#/Organization%20APIs/get_api_external_organization_location_list
            endpoint: '/api/external/organization/location/list',
            retries: 10
        };

        const response = await nango.get<{ data: RecruiterFlowOrganizationLocationResponse[] }>(proxyConfig);
        const locations = response.data.data;

        await nango.batchSave(locations.map(toOrganizationLocation), 'RecruiterFlowOrganizationLocation');
        await nango.deleteRecordsFromPreviousExecutions('RecruiterFlowOrganizationLocation');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;

function toOrganizationLocation(record: RecruiterFlowOrganizationLocationResponse): RecruiterFlowOrganizationLocation {
    return {
        id: record.id.toString(),
        name: record.name,
        address: record.address,
        city: record.city,
        state: record.state,
        country: record.country,
        postal_code: record.postal_code
    };
}
