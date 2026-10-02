import { createSync } from 'nango';
import type { SapSuccessFactorsLocation } from '../types.js';
import { toLocation } from '../mappers/to-location.js';
import { assertFilterPathsExpanded, buildModifiedAfterFilter } from '../helpers/utils.js';

import type { ProxyConfiguration } from 'nango';
import { Location } from '../models.js';
import { z } from 'zod';

const CheckpointSchema = z.object({
    updated_after: z.string()
});

const EXPAND = 'addressNavDEFLT';

/**
 * `toLocation` reads country/state/city/zipCode/addressLine1/addressLine2 off
 * `addressNavDEFLT`, so an address edit has to re-enter the incremental window even when
 * FOLocation's own `lastModifiedDateTime` is untouched.
 */
const MODIFIED_PATHS = ['lastModifiedDateTime', 'addressNavDEFLT/lastModifiedDateTime'];

const sync = createSync({
    description: 'Fetches a list of locations from sap success factors',
    version: '2.2.0',
    frequency: 'every 6 hours',
    autoStart: true,
    checkpoint: CheckpointSchema,

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
        const rawCheckpoint = await nango.getCheckpoint();
        const checkpoint = rawCheckpoint ? CheckpointSchema.parse(rawCheckpoint) : undefined;
        const checkpointUpdatedAfter = checkpoint?.updated_after ? new Date(checkpoint.updated_after) : undefined;
        const runStartedAt = new Date().toISOString();

        assertFilterPathsExpanded(MODIFIED_PATHS, EXPAND);

        const config: ProxyConfiguration = {
            // https://help.sap.com/docs/successfactors-platform/sap-successfactors-api-reference-guide-odata-v2/folocation
            endpoint: '/odata/v2/FOLocation',
            params: {
                $expand: EXPAND,
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
        for await (const records of nango.paginate<SapSuccessFactorsLocation>(config)) {
            const mappedRecords = records.map(toLocation);
            await nango.batchSave(mappedRecords, 'Location');
            recordsSaved += mappedRecords.length;
        }

        await nango.log(
            `locations: advancing checkpoint ${checkpointUpdatedAfter?.toISOString() ?? 'none (full sync)'} -> ${runStartedAt} (${recordsSaved} records)`
        );
        await nango.saveCheckpoint({ updated_after: runStartedAt });
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
