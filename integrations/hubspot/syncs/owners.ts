import { createSync } from 'nango';
import type { ProxyConfiguration } from 'nango';
import { HubspotOwner } from '../models.js';
import { z } from 'zod';

const sync = createSync({
    description: 'Fetches a list of owners from Hubspot',
    version: '2.0.0',
    frequency: 'every day',
    autoStart: true,
    syncType: 'full',

    endpoints: [
        {
            method: 'GET',
            path: '/owners',
            group: 'Owners'
        }
    ],

    models: {
        HubspotOwner: HubspotOwner
    },

    metadata: z.object({}),

    exec: async (nango) => {
        let totalRecords = 0;

        const config: ProxyConfiguration = {
            // https://developers.hubspot.com/docs/reference/api/crm/owners#owners
            endpoint: '/crm/v3/owners',
            paginate: {
                type: 'cursor',
                cursor_path_in_response: 'paging.next.after',
                limit_name_in_request: 'limit',
                cursor_name_in_request: 'after',
                response_path: 'results',
                limit: 100
            }
        };
        for await (const owner of nango.paginate(config)) {
            const mappedOwner: HubspotOwner[] = owner.map(mapOwner) || [];

            const batchSize: number = mappedOwner.length;
            totalRecords += batchSize;
            await nango.log(`Saving batch of ${batchSize} owners (total owners: ${totalRecords})`);
            await nango.batchSave(mappedOwner, 'HubspotOwner');
        }
        await nango.deleteRecordsFromPreviousExecutions('HubspotOwner');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;

function mapOwner(owner: any): HubspotOwner {
    return {
        id: owner.id,
        email: owner.email,
        firstName: owner.firstName,
        lastName: owner.lastName,
        userId: owner.userId,
        createdAt: owner.createdAt,
        updatedAt: owner.updatedAt,
        archived: owner.archived
    };
}
