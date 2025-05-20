import type { NangoSync, GongCallTranscriptSyncOutput, GongCallTranscriptMetadata, ProxyConfiguration } from '../../models';
import type { FilterFields, GongCallTranscript } from '../types';
import { toCallTranscript } from '../mappers/to-call-transcript.js';

const DEFAULT_BACKFILL_MS = 365 * 24 * 60 * 60 * 1000;

export default async function fetchData(nango: NangoSync): Promise<void> {
    let fetchSince: Date;
    const metadata = await nango.getMetadata<GongCallTranscriptMetadata>();
    if (nango.lastSyncDate) {
        fetchSince = nango.lastSyncDate;
    } else {
        const backfillMilliseconds = metadata?.backfillPeriodMs || DEFAULT_BACKFILL_MS;
        fetchSince = new Date(Date.now() - backfillMilliseconds);
    }

    const toDateTime = new Date();
    await nango.log(`Fetching Gong calls from ${fetchSince.toISOString()} to ${toDateTime.toISOString()}`);

    const filter: FilterFields = {
        fromDateTime: fetchSince.toISOString(),
        toDateTime: toDateTime.toISOString(),
        callIds: metadata.callIds,
        workspaceId: metadata.workspaceId
    };

    const config: ProxyConfiguration = {
        // https://app.gong.io/settings/api/documentation#post-/v2/calls/transcript
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

    const callTranscripts: GongCallTranscriptSyncOutput[] = [];
    for await (const records of nango.paginate<GongCallTranscript>(config)) {
        const mappedCallTranscripts = toCallTranscript(records);
        callTranscripts.push(...mappedCallTranscripts);
    }
    if (callTranscripts.length > 0) {
        await nango.batchSave(callTranscripts, 'GongCallTranscriptSyncOutput');
    }
}
