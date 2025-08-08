import { createSync } from "nango";
import type { SapSuccessFactorsLocation } from '../types.js';
import { toLocation } from '../mappers/to-location.js';

import type { ProxyConfiguration } from "nango";
import { Location } from "../models.js";
import { z } from "zod";

const sync = createSync({
    description: "Fetches a list of locations from sap success factors",
    version: "2.0.0",
    frequency: "every 6 hours",
    autoStart: true,
    syncType: "incremental",
    trackDeletes: false,

    endpoints: [{
        method: "GET",
        path: "/locations",
        group: "Locations"
    }],

    models: {
        Location: Location
    },

    metadata: z.object({}),

    exec: async nango => {
        const config: ProxyConfiguration = {
            // https://help.sap.com/docs/successfactors-platform/sap-successfactors-api-reference-guide-odata-v2/folocation
            endpoint: '/odata/v2/FOLocation',
            params: {
                $expand: 'addressNavDEFLT',
                $format: 'json',
                ...(nango.lastSyncDate && {
                    $filter: `lastModifiedDateTime ge datetime'${nango.lastSyncDate.toISOString()}'`
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

        for await (const records of nango.paginate<SapSuccessFactorsLocation>(config)) {
            const mappedRecords = records.map(toLocation);
            await nango.batchSave(mappedRecords, 'Location');
        }
    }
});

export type NangoSyncLocal = Parameters<typeof sync["exec"]>[0];
export default sync;
