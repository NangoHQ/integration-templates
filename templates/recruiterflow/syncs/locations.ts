import { createSync } from "nango";
import type { RecruiterFlowLocationResponse } from '../types.js';

import type { ProxyConfiguration } from "nango";
import { RecruiterFlowLocation } from "../models.js";
import { z } from "zod";

const sync = createSync({
    description: "Syncs all locations from RecruiterFlow",
    version: "2.0.0",
    frequency: "every hour",
    autoStart: true,
    syncType: "full",
    trackDeletes: true,

    endpoints: [{
        method: "GET",
        path: "/locations",
        group: "Locations"
    }],

    models: {
        RecruiterFlowLocation: RecruiterFlowLocation
    },

    metadata: z.object({}),

    exec: async nango => {
        const proxyConfig: ProxyConfiguration = {
            // https://recruiterflow.com/api#/Job%20APIs/get_api_external_location_list
            endpoint: '/api/external/location/list',
            retries: 10
        };

        const response = await nango.get<{ data: RecruiterFlowLocationResponse[] }>(proxyConfig);
        const locations = response.data.data;

        await nango.batchSave(locations.map(toLocation), 'RecruiterFlowLocation');
    }
});

export type NangoSyncLocal = Parameters<typeof sync["exec"]>[0];
export default sync;

function toLocation(record: RecruiterFlowLocationResponse): RecruiterFlowLocation {
    return {
        id: record.id.toString(),
        name: record.name,
        city: record.city || undefined,
        country: record.country || undefined,
        details: record.details || undefined,
        iso_3166_1_alpha_2_code: record.iso_3166_1_alpha_2_code || undefined,
        location_type: record.location_type,
        location_type_id: record.location_type_id,
        postal_code: record.postal_code || undefined,
        state: record.state || undefined,
        zipcode: record.zipcode || undefined
    };
}
