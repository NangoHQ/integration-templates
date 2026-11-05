import { createSync } from 'nango';
import type { SapSuccessDepartment } from '../types.js';
import { toGroup } from '../mappers/to-group.js';
import { buildModifiedAfterFilter } from '../helpers/utils.js';

import type { ProxyConfiguration } from 'nango';
import { Group } from '../models.js';
import { z } from 'zod';

const CheckpointSchema = z.object({
    updated_after: z.string()
});

/**
 * `toGroup` reads only flat FODepartment fields, so the parent's `lastModifiedDateTime`
 * is sufficient here and no nav property needs watching.
 */
const MODIFIED_PATHS = ['lastModifiedDateTime'];

const sync = createSync({
    description: 'Fetches a list of organizational groups from sap success factors',
    version: '2.1.0',
    frequency: 'every 6 hours',
    autoStart: true,
    checkpoint: CheckpointSchema,

    endpoints: [
        {
            method: 'GET',
            path: '/groups',
            group: 'Groups'
        }
    ],

    models: {
        Group: Group
    },

    metadata: z.object({}),

    exec: async (nango) => {
        const rawCheckpoint = await nango.getCheckpoint();
        const checkpoint = rawCheckpoint ? CheckpointSchema.parse(rawCheckpoint) : undefined;
        const checkpointUpdatedAfter = checkpoint?.updated_after ? new Date(checkpoint.updated_after) : undefined;
        const runStartedAt = new Date().toISOString();

        const config: ProxyConfiguration = {
            // https://help.sap.com/docs/successfactors-platform/sap-successfactors-api-reference-guide-odata-v2/fodepartment
            endpoint: '/odata/v2/FODepartment',
            params: {
                $format: 'json',
                ...(checkpointUpdatedAfter && {
                    $filter: buildModifiedAfterFilter(MODIFIED_PATHS, checkpointUpdatedAfter)
                })
            },
            paginate: {
                type: 'offset',
                offset_calculation_method: 'by-response-size',
                offset_name_in_request: '$skip',
                offset_start_value: 0,
                limit: 100,
                limit_name_in_request: '$top',
                response_path: 'd.results'
            },
            retries: 10
        };

        let recordsSaved = 0;
        for await (const records of nango.paginate<SapSuccessDepartment>(config)) {
            const mappedRecords = records.map(toGroup);
            await nango.batchSave(mappedRecords, 'Group');
            recordsSaved += mappedRecords.length;
        }

        await nango.log(
            `groups: advancing checkpoint ${checkpointUpdatedAfter?.toISOString() ?? 'none (full sync)'} -> ${runStartedAt} (${recordsSaved} records)`
        );
        await nango.saveCheckpoint({ updated_after: runStartedAt });
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
