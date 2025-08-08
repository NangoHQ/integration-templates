import { createSync } from "nango";
import type { SapSuccessDepartment } from '../types.js';
import { toGroup } from '../mappers/to-group.js';

import type { ProxyConfiguration } from "nango";
import { Group } from "../models.js";
import { z } from "zod";

const sync = createSync({
    description: "Fetches a list of organizational groups from sap success factors",
    version: "2.0.0",
    frequency: "every 6 hours",
    autoStart: true,
    syncType: "incremental",
    trackDeletes: false,

    endpoints: [{
        method: "GET",
        path: "/groups",
        group: "Groups"
    }],

    models: {
        Group: Group
    },

    metadata: z.object({}),

    exec: async nango => {
        const config: ProxyConfiguration = {
            // https://help.sap.com/docs/successfactors-platform/sap-successfactors-api-reference-guide-odata-v2/fodepartment
            endpoint: '/odata/v2/FODepartment',
            params: {
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

        for await (const records of nango.paginate<SapSuccessDepartment>(config)) {
            const mappedRecords = records.map(toGroup);
            await nango.batchSave(mappedRecords, 'Group');
        }
    }
});

export type NangoSyncLocal = Parameters<typeof sync["exec"]>[0];
export default sync;
