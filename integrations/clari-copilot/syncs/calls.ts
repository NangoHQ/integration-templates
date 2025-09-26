import { createSync } from 'nango';
import type { ProxyConfiguration } from 'nango';
import { ClariCopilotCall } from '../models.js';
import { z } from 'zod';

const LIMIT = 100;

const sync = createSync({
    description: 'Fetches a list of calls from your account. For the first sync, it will go back to the past one year',
    version: '2.0.0',
    frequency: 'every hour',
    autoStart: true,
    syncType: 'incremental',

    endpoints: [
        {
            method: 'GET',
            path: '/calls'
        }
    ],

    models: {
        ClariCopilotCall: ClariCopilotCall
    },

    metadata: z.object({}),

    exec: async (nango) => {
        let totalRecords = 0;

        const calls: any[] = await getAllCalls(nango);

        for (const Specificall of calls) {
            const call = await getSpecificCall(nango, Specificall.id);
            if (call) {
                const mappedCall: ClariCopilotCall = mapCall(call);

                totalRecords++;
                await nango.log(`Saving call for call ${call.id} (total call(s): ${totalRecords})`);
                await nango.batchSave([mappedCall], 'ClariCopilotCall');
            }
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;

async function getAllCalls(nango: NangoSyncLocal) {
    const records: any[] = [];

    //first run to get all calls from the past 1 year
    const lastSyncDate = nango.lastSyncDate;
    const queryDate = lastSyncDate ? lastSyncDate.toISOString() : new Date(new Date().setFullYear(new Date().getFullYear() - 1)).toISOString();

    const config: ProxyConfiguration = {
        // https://api-doc.copilot.clari.com/#tag/call/paths/~1calls/get
        endpoint: '/calls',
        params: { filterTimeGt: queryDate }, // filter calls after lastSyncDate
        paginate: {
            type: 'offset',
            offset_name_in_request: 'skip',
            response_path: 'calls',
            limit_name_in_request: 'limit',
            limit: LIMIT
        }
    };

    for await (const recordBatch of nango.paginate(config)) {
        records.push(...recordBatch);
    }

    return records;
}

async function getSpecificCall(nango: NangoSyncLocal, callId: string) {
    const endpoint = `/call-details`;

    const call = await nango.get({
        endpoint,
        params: {
            id: callId,
            includeAudio: 'true',
            includeVideo: 'true'
        },
        retries: 10
    });

    return mapCall(call.data.call);
}

function mapCall(call: any): ClariCopilotCall {
    return {
        id: call.id,
        source_id: call.source_id,
        title: call.title,
        users: call.users,
        externalParticipants: call.externalParticipants,
        status: call.status,
        bot_not_join_reason: call.bot_not_join_reason,
        type: call.type,
        time: call.time,
        icaluid: call.icaluid,
        calendar_id: call.calendar_id,
        recurring_event_id: call.recurring_event_id,
        original_start_time: call.original_start_time,
        last_modified_time: call.last_modified_time,
        audio_url: call.audio_url,
        video_url: call.video_url,
        disposition: call.disposition,
        deal_name: call.deal_name,
        deal_value: call.deal_value,
        deal_close_date: call.deal_close_date,
        deal_stage_before_call: call.deal_stage_before_call,
        account_name: call.account_name,
        contact_names: call.contact_names,
        crm_info: call.crm_info,
        bookmark_timestamps: call.bookmark_timestamps,
        metrics: call.metrics,
        call_review_page_url: call.call_review_page_url,
        deal_stage_live: call.deal_stage_live,
        transcript: call.transcript,
        summary: call.summary,
        competitor_sentiments: call.competitor_sentiments
    };
}
