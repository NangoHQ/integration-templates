import type { LeverOpportunityInterview, NangoSync, ProxyConfiguration } from '../../models';

const LIMIT = 100;

export default async function fetchData(nango: NangoSync) {
    let totalRecords = 0;

    const opportunities: any[] = await getAllOpportunities(nango);

    for (const opportunity of opportunities) {
        const config = {
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

async function getAllOpportunities(nango: NangoSync) {
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
