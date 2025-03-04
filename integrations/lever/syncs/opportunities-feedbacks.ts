import type { LeverOpportunityFeedback, NangoSync, ProxyConfiguration } from '../../models';

const LIMIT = 100;

export default async function fetchData(nango: NangoSync) {
    let totalRecords = 0;

    const opportunities: any[] = await getAllOpportunities(nango);

    for (const opportunity of opportunities) {
        const config: ProxyConfiguration = {
            // https://hire.lever.co/developer/documentation#list-all-feedback
            endpoint: `/v1/opportunities/${opportunity.id}/feedback`,
            paginate: {
                type: 'cursor',
                cursor_path_in_response: 'next',
                cursor_name_in_request: 'offset',
                limit_name_in_request: 'limit',
                response_path: 'data',
                limit: LIMIT
            }
        };
        for await (const feedback of nango.paginate(config)) {
            const mappedFeedback: LeverOpportunityFeedback[] = feedback.map(mapFeedback) || [];
            // Save feedbacks
            const batchSize: number = mappedFeedback.length;
            totalRecords += batchSize;
            await nango.log(`Saving batch of ${batchSize} feedback(s) for opportunity ${opportunity.id} (total feedback(s): ${totalRecords})`);
            await nango.batchSave(mappedFeedback, 'LeverOpportunityFeedback');
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

function mapFeedback(feedback: any): LeverOpportunityFeedback {
    return {
        id: feedback.id,
        type: feedback.type,
        text: feedback.text,
        instructions: feedback.instructions,
        fields: feedback.fields,
        baseTemplateId: feedback.baseTemplateId,
        interview: feedback.interview,
        panel: feedback.panel,
        user: feedback.user,
        createdAt: feedback.createdAt,
        completedAt: feedback.completedAt,
        updatedAt: feedback.updatedAt,
        deletedAt: feedback.deletedAt
    };
}
