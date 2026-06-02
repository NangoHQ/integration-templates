import { createSync } from 'nango';
import { toStandardEmployee } from '../mappers/to-standard-employee.js';
import { paginate } from '../helpers/paginate.js';
import type { PaginationParams } from '../helpers/paginate.js';

import { StandardEmployee } from '../models.js';
import * as z from 'zod';

const CheckpointSchema = z.object({
    updated_after: z.string()
});

const sync = createSync({
    description: 'Fetches a list of current employees from Namely and maps them to the standard HRIS model',
    version: '0.1.0',
    frequency: 'every 1h',
    autoStart: true,
    checkpoint: CheckpointSchema,

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
        const rawCheckpoint = await nango.getCheckpoint();
        const checkpoint = rawCheckpoint ? CheckpointSchema.parse(rawCheckpoint) : undefined;
        const checkpointUpdatedAfter = checkpoint?.updated_after ? new Date(checkpoint.updated_after) : undefined;
        const runStartedAt = new Date().toISOString();

        const paginationParams: PaginationParams = {
            // https://developers.namely.com/docs/namely-api/f3cb460079577-get-all-profiles
            endpoint: '/v1/profiles',
            limit: 100,
            responseDataPath: 'profiles',
            additionalFilters: {
                sort: '-updated_at'
            },
            updatedAfter: checkpointUpdatedAfter
        };

        for await (const { profiles, groups } of paginate(nango, paginationParams)) {
            const standardEmployees = profiles.map((profile) => toStandardEmployee(profile, groups));
            await nango.batchSave(standardEmployees, 'StandardEmployee');
        }

        await nango.saveCheckpoint({ updated_after: runStartedAt });
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
