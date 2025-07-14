import { createSync } from "nango";
import type { AttioDealResponse } from '../types.js';
import { toDeal } from '../mappers/to-deal.js';

import type { ProxyConfiguration } from "nango";
import { AttioDeal } from "../models.js";
import { z } from "zod";

const sync = createSync({
    description: "Fetches all deal records from Attio",
    version: "0.0.1",
    frequency: "every hour",
    autoStart: true,
    syncType: "full",
    trackDeletes: true,

    endpoints: [{
        method: "GET",
        path: "/deals",
        group: "Deals"
    }],

    scopes: ["record_permission:read", "object_configuration:read"],

    models: {
        AttioDeal: AttioDeal
    },

    metadata: z.object({}),

    exec: async nango => {
        const config: ProxyConfiguration = {
            // https://docs.attio.com/rest-api/endpoint-reference/standard-objects/deals/list-deal-records
            endpoint: '/v2/objects/deals/records/query',
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

        for await (const page of nango.paginate<AttioDealResponse>(config)) {
            const deals = page.map(toDeal);
            await nango.batchSave(deals, 'AttioDeal');
        }
    }
});

export type NangoSyncLocal = Parameters<typeof sync["exec"]>[0];
export default sync;
