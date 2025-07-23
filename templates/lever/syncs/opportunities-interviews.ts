import { createSync } from "nango";
import type { ProxyConfiguration } from "nango";
import { LeverOpportunityInterview } from "../models.js";
import { z } from "zod";

const LIMIT = 100;

const sync = createSync({
    description: "Fetches a list of all interviews for every single opportunity",
    version: "1.0.1",
    frequency: "every 6 hours",
    autoStart: true,
    syncType: "full",
    trackDeletes: false,

    endpoints: [{
        method: "GET",
        path: "/opportunities/interviews",
        group: "Opportunities"
    }],

    scopes: ["interviews:read:admin"],

    models: {
        LeverOpportunityInterview: LeverOpportunityInterview
    },

    metadata: z.object({}),

    exec: async nango => {
        let totalRecords = 0;

        const opportunities: any[] = await getAllOpportunities(nango);

        for (const opportunity of opportunities) {
            const config: ProxyConfiguration = {
                // https://hire.lever.co/developer/documentation#list-all-interviews
                endpoint: `/v1/opportunities/${opportunity.id}/interviews`,
                paginate: {
                    type: 'cursor',
                    cursor_path_in_response: 'next',
                    cursor_name_in_request: 'offset',
                    limit_name_in_request: 'limit',
                    response_path: 'data',
                    limit: LIMIT
                }
            };
            for await (const interview of nango.paginate(config)) {
                const mappedInterview: LeverOpportunityInterview[] = interview.map(mapInterview) || [];
                // Save interviews
                const batchSize: number = mappedInterview.length;
                totalRecords += batchSize;
                await nango.log(`Saving batch of ${batchSize} interview(s) for opportunity ${opportunity.id} (total feedbacks: ${totalRecords})`);
                await nango.batchSave(mappedInterview, 'LeverOpportunityInterview');
            }
        }
    }
});

export type NangoSyncLocal = Parameters<typeof sync["exec"]>[0];
export default sync;

async function getAllOpportunities(nango: NangoSyncLocal) {
    const records: any[] = [];
    const config: ProxyConfiguration = {
        // https://hire.lever.co/developer/documentation#list-all-opportunities
        endpoint: '/v1/opportunities',
        paginate: {
            type: 'cursor',
            cursor_path_in_response: 'next',
            cursor_name_in_request: 'offset',
            limit_name_in_request: 'limit',
            response_path: 'data',
            limit: LIMIT
        }
    };

    for await (const recordBatch of nango.paginate(config)) {
        records.push(...recordBatch);
    }

    return records;
}

function mapInterview(interview: any): LeverOpportunityInterview {
    return {
        id: interview.id,
        panel: interview.panel,
        subject: interview.subject,
        note: interview.note,
        interviewers: interview.interviewers,
        timezone: interview.timezone,
        createdAt: interview.createdAt,
        date: interview.date,
        duration: interview.duration,
        location: interview.location,
        feedbackTemplate: interview.feedbackTemplate,
        feedbackForms: interview.feedbackForms,
        feedbackReminder: interview.feedbackReminder,
        user: interview.user,
        stage: interview.stage,
        canceledAt: interview.canceledAt,
        postings: interview.postings,
        gcalEventUrl: interview.gcalEventUrl
    };
}
