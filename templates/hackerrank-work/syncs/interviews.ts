import { createSync } from "nango";
import type { ProxyConfiguration } from "nango";
import { HackerRankWorkInterview } from "../models.js";
import { z } from "zod";

const sync = createSync({
    description: "Fetches a list of interviews from hackerrank work",
    version: "1.0.1",
    frequency: "every 6 hours",
    autoStart: true,
    syncType: "incremental",
    trackDeletes: false,

    endpoints: [{
        method: "GET",
        path: "/interviews",
        group: "Interviews"
    }],

    models: {
        HackerRankWorkInterview: HackerRankWorkInterview
    },

    metadata: z.object({}),

    exec: async nango => {
        let totalRecords = 0;

        const now = new Date();
        const config: ProxyConfiguration = {
            // https://www.hackerrank.com/work/apidocs#!/Interviews/get_x_api_v3_interviews
            endpoint: '/x/api/v3/interviews',
            //datetime filter is offered
            ...(nango.lastSyncDate ? { params: { updated_at: nango.lastSyncDate?.toISOString() + '..' + now.toISOString() } } : {}),

            paginate: {
                type: 'link',
                limit_name_in_request: 'limit',
                link_path_in_response_body: 'next',
                response_path: 'data',
                limit: 100
            }
        };
        for await (const interview of nango.paginate(config)) {
            const mappedInterview: HackerRankWorkInterview[] = interview.map(mapInterview) || [];
            // Save Interviews
            const batchSize: number = mappedInterview.length;
            totalRecords += batchSize;
            await nango.log(`Saving batch of ${batchSize} interview(s) (total interview(s): ${totalRecords})`);
            await nango.batchSave(mappedInterview, 'HackerRankWorkInterview');
        }
    }
});

export type NangoSyncLocal = Parameters<typeof sync["exec"]>[0];
export default sync;

function mapInterview(interview: any): HackerRankWorkInterview {
    return {
        id: interview.id,
        status: interview.status,
        created_at: interview.created_at,
        updated_at: interview.updated_at,
        title: interview.title,
        feedback: interview.feedback,
        notes: interview.notes,
        metadata: interview.metadata,
        quickpad: interview.quickpad,
        ended_at: interview.ended_at,
        timezone: interview.timezone,
        interview_template_id: interview.interview_template_id,
        from: interview.from,
        to: interview.to,
        url: interview.url,
        user: interview.user,
        thumbs_up: interview.thumbs_up,
        resume_url: interview.resume_url,
        interviewers: interview.interviewers,
        candidate: interview.candidate,
        result_url: interview.result_url,
        report_url: interview.report_url
    };
}
