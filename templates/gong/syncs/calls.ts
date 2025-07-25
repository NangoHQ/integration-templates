import { createSync } from "nango";
import { toCall } from '../mappers/to-call.js';
import type { AxiosError, GongCallExtensive, GongCallResponse, GongError } from '../types.js';
import { ExposedFieldsKeys } from '../types.js';

import type { ProxyConfiguration } from "nango";
import { GongCallOutput, GongConnectionMetadata } from "../models.js";

const DEFAULT_BACKFILL_MS = 365 * 24 * 60 * 60 * 1000;
const DEFAULT_BACKFILL_DAYS = 14;
const BATCH_SIZE = 100; //just incase gong fails to honour the 100 records per page limit

const sync = createSync({
    description: "Fetches a list of calls from Gong",
    version: "2.0.0",
    frequency: "every 1h",
    autoStart: true,
    syncType: "incremental",
    trackDeletes: false,

    endpoints: [{
        method: "GET",
        path: "/calls",
        group: "Calls"
    }],

    scopes: [
        "api:calls:read:basic",
        "api:calls:read:media-url",
        "api:calls:read:extensive"
    ],

    models: {
        GongCallOutput: GongCallOutput
    },

    metadata: GongConnectionMetadata,

    exec: async nango => {
        const metadata = await nango.getMetadata();
        let fetchSince: Date;
        if (nango.lastSyncDate) {
            const lastSyncDate = new Date(nango.lastSyncDate);
            const backfillDays = metadata?.lastSyncBackfillPeriod || DEFAULT_BACKFILL_DAYS;
            const backfillMs = backfillDays * 24 * 60 * 60 * 1000;
            fetchSince = new Date(lastSyncDate.getTime() - backfillMs);
        } else {
            const backfillMilliseconds = metadata?.backfillPeriodMs || DEFAULT_BACKFILL_MS;
            fetchSince = new Date(Date.now() - backfillMilliseconds);
        }
        const toDateTime = new Date();
        await nango.log(`Fetching Gong calls from ${fetchSince.toISOString()} to ${toDateTime.toISOString()}`);

        const proxyConfig: ProxyConfiguration = {
            // https://app.gong.io/settings/api/documentation#get-/v2/calls
            // https://visioneers.gong.io/developers-79/gong-api-pagination-limit-1036
            // although not mentioned from the above forum Gong API endpoints only return 100 records per HTTP Request
            endpoint: '/v2/calls',
            retries: 10,
            paginate: {
                type: 'cursor',
                cursor_name_in_request: 'cursor',
                cursor_path_in_response: 'records.cursor',
                response_path: 'calls'
            },
            params: {
                fromDateTime: fetchSince.toISOString(),
                toDateTime: toDateTime.toISOString()
            }
        };

        // @allowTryCatch
        try {
            for await (const records of nango.paginate<GongCallResponse>(proxyConfig)) {
                const callIds = records.map((record) => record.id);
                for (let i = 0; i < callIds.length; i += BATCH_SIZE) {
                    const batchCallIds = callIds.slice(i, i + BATCH_SIZE);
                    await nango.log(`Processing batch of ${batchCallIds.length} calls...`);

                    if (batchCallIds.length > 0) {
                        const extensiveDetails = await fetchExtensiveDetails(nango, batchCallIds);
                        const mappedCalls = extensiveDetails.map(toCall);

                        if (mappedCalls.length > 0) {
                            await nango.batchSave(mappedCalls, 'GongCallOutput');
                        }
                    }
                }
            }
        } catch (error: any) {
            // eslint-disable-next-line @nangohq/custom-integrations-linting/no-object-casting
            const errors = (error as AxiosError<GongError>).response?.data?.errors ?? [];
            const emptyResult = errors.includes('No calls found corresponding to the provided filters');

            if (emptyResult) {
                await nango.log('No calls found for the given filters, skipping sync.');
            } else {
                throw error;
            }
        }
    }
}); //just incase gong fails to honour the 100 records per page limit

export type NangoSyncLocal = Parameters<typeof sync["exec"]>[0];
export default sync;

async function fetchExtensiveDetails(nango: NangoSyncLocal, callIds: string[]): Promise<GongCallExtensive[]> {
    const extensiveDetails: GongCallExtensive[] = [];
    const config: ProxyConfiguration = {
        // https://app.gong.io/settings/api/documentation#post-/v2/calls/extensive
        endpoint: '/v2/calls/extensive',
        data: {
            filter: {
                callIds
            },
            contentSelector: { exposedFields: ExposedFieldsKeys }
        },
        retries: 10,
        method: 'POST',
        paginate: {
            type: 'cursor',
            cursor_name_in_request: 'cursor',
            cursor_path_in_response: 'records.cursor',
            in_body: true,
            response_path: 'calls'
        }
    };

    // @allowTryCatch
    try {
        for await (const page of nango.paginate<GongCallExtensive>(config)) {
            extensiveDetails.push(...page);
        }

        return extensiveDetails;
    } catch (error: any) {
        // eslint-disable-next-line @nangohq/custom-integrations-linting/no-object-casting
        const errors = (error as AxiosError<GongError>).response?.data?.errors ?? [];
        const emptyResult = errors.includes('No calls found corresponding to the provided filters');
        if (emptyResult) {
            return extensiveDetails;
        } else {
            throw error;
        }
    }
}
