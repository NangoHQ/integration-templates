import { createSync } from "nango";
import type { FilterFields, GongCallTranscript, AxiosError, GongError } from '../types.js';
import { toCallTranscript } from '../mappers/to-call-transcript.js';

import type { ProxyConfiguration } from "nango";

import {
    GongCallTranscriptSyncOutput,
    GongCallTranscriptMetadata,
    GongCallTranscript,
} from "../models.js";

const DEFAULT_BACKFILL_MS = 365 * 24 * 60 * 60 * 1000;
const DEFAULT_BACKFILL_DAYS = 14;
const BATCH_SIZE = 100; //just incase gong fails to honour the 100 records per page limit

const sync = createSync({
    description: "Fetches a list of call transcripts from Gong",
    version: "1.0.3",
    frequency: "every 1h",
    autoStart: true,
    syncType: "incremental",
    trackDeletes: false,

    endpoints: [{
        method: "GET",
        path: "/call-transcripts",
        group: "Calls"
    }],

    scopes: ["api:calls:read:transcript"],

    models: {
        GongCallTranscriptSyncOutput: GongCallTranscriptSyncOutput
    },

    metadata: GongCallTranscriptMetadata,

    exec: async nango => {
        let fetchSince: Date;
        const metadata = await nango.getMetadata();
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

        const filter: FilterFields = {
            fromDateTime: fetchSince.toISOString(),
            toDateTime: toDateTime.toISOString(),
            ...(metadata?.callIds && { callIds: metadata.callIds }),
            ...(metadata?.workspaceId && { workspaceId: metadata.workspaceId })
        };

        const config: ProxyConfiguration = {
            // https://app.gong.io/settings/api/documentation#post-/v2/calls/transcript
            // https://visioneers.gong.io/developers-79/gong-api-pagination-limit-1036
            // although not mentioned from the above forum Gong API endpoints only return 100 records per HTTP Request
            endpoint: '/v2/calls/transcript',
            data: {
                filter
            },
            retries: 10,
            method: 'POST',
            paginate: {
                type: 'cursor',
                cursor_name_in_request: 'cursor',
                cursor_path_in_response: 'records.cursor',
                in_body: true,
                response_path: 'callTranscripts'
            }
        };

        // @allowTryCatch
        try {
            for await (const records of nango.paginate<GongCallTranscript>(config)) {
                for (let i = 0; i < records.length; i += BATCH_SIZE) {
                    const batchRecords = records.slice(i, i + BATCH_SIZE);
                    await nango.log(`Processing batch of ${batchRecords.length} calls...`);
                    const mappedCallTranscripts = toCallTranscript(batchRecords);

                    if (mappedCallTranscripts.length > 0) {
                        await nango.batchSave(mappedCallTranscripts, 'GongCallTranscriptSyncOutput');
                    }
                }
            }
        } catch (error: any) {
            // eslint-disable-next-line @nangohq/custom-integrations-linting/no-object-casting
            const errors = (error as AxiosError<GongError>).response?.data?.errors ?? [];
            const emptyResult = errors.includes('No calls found corresponding to the provided filters');

            if (emptyResult) {
                await nango.log('No calls found for the given filters', { level: 'error' });
                return;
            }

            throw error;
        }
    }
}); //just incase gong fails to honour the 100 records per page limit

export type NangoSyncLocal = Parameters<typeof sync["exec"]>[0];
export default sync;
