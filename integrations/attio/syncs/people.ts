import { createSync } from 'nango';
import type { AttioPersonResponse } from '../types.js';
import { toPerson } from '../mappers/to-person.js';

import type { ProxyConfiguration } from 'nango';
import { AttioPerson } from '../models.js';
import { z } from 'zod';

const sync = createSync({
    description: 'Fetches all person records from Attio',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    syncType: 'full',

    endpoints: [
        {
            method: 'GET',
            path: '/people',
            group: 'People'
        }
    ],

    scopes: ['record_permission:read', 'object_configuration:read'],

    models: {
        AttioPerson: AttioPerson
    },

    metadata: z.object({}),

    exec: async (nango) => {
        const config: ProxyConfiguration = {
            // https://docs.attio.com/rest-api/endpoint-reference/standard-objects/people/list-person-records
            endpoint: '/v2/objects/people/records/query',
            method: 'POST',
            retries: 10,
            data: {
                limit: 500,
                offset: 0
            },
            paginate: {
                type: 'offset',
                limit_name_in_request: 'limit',
                offset_name_in_request: 'offset',
                offset_start_value: 0,
                response_path: 'data'
            }
        };

        for await (const page of nango.paginate<AttioPersonResponse>(config)) {
            const people = page.map(toPerson);
            await nango.batchSave(people, 'AttioPerson');
        }

        await nango.deleteRecordsFromPreviousExecutions("AttioPerson");
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
