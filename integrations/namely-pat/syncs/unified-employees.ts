import { createSync } from 'nango';
import { toStandardEmployee } from '../mappers/to-standard-employee.js';
import { paginate } from '../helpers/paginate.js';
import type { PaginationParams } from '../helpers/paginate.js';

import { StandardEmployee } from '../models.js';
import * as z from 'zod';

const sync = createSync({
    description: 'Fetches a list of current employees from Namely and maps them to the standard HRIS model',
    version: '0.0.1',
    frequency: 'every 1h',
    autoStart: true,
    syncType: 'incremental',

    endpoints: [
        {
            method: 'GET',
            path: '/employees/unified',
            group: 'Unified HRIS API'
        }
    ],

    models: {
        StandardEmployee: StandardEmployee
    },

    metadata: z.object({}),

    exec: async (nango) => {
        const paginationParams: PaginationParams = {
            // https://developers.namely.com/docs/namely-api/f3cb460079577-get-all-profiles
            endpoint: '/v1/profiles',
            limit: 100,
            responseDataPath: 'profiles',
            additionalFilters: {
                sort: '-updated_at'
            },
            lastSyncDate: nango.lastSyncDate
        };

        for await (const { profiles, groups } of paginate(nango, paginationParams)) {
            const standardEmployees = profiles.map((profile) => toStandardEmployee(profile, groups));
            await nango.batchSave(standardEmployees, 'StandardEmployee');
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
