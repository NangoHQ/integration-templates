import type { LeverOpportunityApplication, NangoSync, ProxyConfiguration } from '../../models';

const LIMIT = 100;

export default async function fetchData(nango: NangoSync) {
    let totalRecords = 0;

    const opportunities: any[] = await getAllOpportunities(nango);

    for (const opportunity of opportunities) {
        const config: ProxyConfiguration = {
            // https://hire.lever.co/developer/documentation#list-all-applications
            endpoint: `/v1/opportunities/${opportunity.id}/applications`,
            paginate: {
                type: 'cursor',
                cursor_path_in_response: 'next',
                cursor_name_in_request: 'offset',
                limit_name_in_request: 'limit',
                response_path: 'data',
                limit: LIMIT
            }
        };
        for await (const application of nango.paginate(config)) {
            const mappedApplication: LeverOpportunityApplication[] = application.map(mapApplication) || [];
            // Save applications
            const batchSize: number = mappedApplication.length;
            totalRecords += batchSize;
            await nango.log(`Saving batch of ${batchSize} application(s) for opportunity ${opportunity.id} (total application(s): ${totalRecords})`);
            await nango.batchSave(mappedApplication, 'LeverOpportunityApplication');
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

function mapApplication(application: any): LeverOpportunityApplication {
    return {
        id: application.id,
        opportunityId: application.opportunityId,
        candidateId: application.candidateId,
        createdAt: application.createdAt,
        type: application.type,
        posting: application.posting,
        postingHiringManager: application.postingHiringManager,
        postingOwner: application.postingOwner,
        user: application.user,
        name: application.name,
        email: application.email,
        phone: application.phone,
        requisitionForHire: application.requisitionForHire,
        ownerId: application.ownerId,
        hiringManager: application.hiringManager,
        company: application.company,
        links: application.links,
        comments: application.comments,
        customQuestions: application.customQuestions,
        archived: application.archived
    };
}
