import { createSync } from 'nango';
import type { AttioCompanyResponse } from '../types.js';
import { toCompany } from '../mappers/to-company.js';

import type { ProxyConfiguration } from 'nango';
import { AttioCompany } from '../models.js';
import { z } from 'zod';

const sync = createSync({
    description: 'Fetches all company records from Attio',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    syncType: 'full',

    endpoints: [
        {
            method: 'GET',
            path: '/companies',
            group: 'Companies'
        }
    ],

    scopes: ['record_permission:read', 'object_configuration:read'],

    models: {
        AttioCompany: AttioCompany
    },

    metadata: z.object({}),

    exec: async (nango) => {
        const config: ProxyConfiguration = {
            // https://docs.attio.com/rest-api/endpoint-reference/standard-objects/companies/list-company-records
            endpoint: '/v2/objects/companies/records/query',
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

        for await (const page of nango.paginate<AttioCompanyResponse>(config)) {
            const companies = page.map(toCompany);
            await nango.batchSave(companies, 'AttioCompany');
        }

        await nango.deleteRecordsFromPreviousExecutions("AttioCompany");
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
