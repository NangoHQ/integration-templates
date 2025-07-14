import type { WorkableCandidateActivity, NangoSync, ProxyConfiguration } from '../../models.js';

const LIMIT = 100;

export default async function fetchData(nango: NangoSync) {
    let totalRecords = 0;

    const candidates: any[] = await getAllCandidates(nango);

    for (const candidate of candidates) {
        const config: ProxyConfiguration = {
            // https://workable.readme.io/reference/candidate-activities
            endpoint: `/spi/v3/candidates/${candidate.id}/activities`,
            paginate: {
                type: 'link',
                link_path_in_response_body: 'paging.next',
                limit_name_in_request: 'limit',
                response_path: 'activities',
                limit: LIMIT
            }
        };
        for await (const activity of nango.paginate(config)) {
            const mappedActivity: WorkableCandidateActivity[] = activity.map(mapActivity) || [];

            const batchSize: number = mappedActivity.length;
            totalRecords += batchSize;
            await nango.log(`Saving batch of ${batchSize} activitie(s) for candidate ${candidate.id} (total activitie(s): ${totalRecords})`);
            await nango.batchSave(mappedActivity, 'WorkableCandidateActivity');
        }
    }
}

async function getAllCandidates(nango: NangoSync) {
    const records: any[] = [];
    const proxyConfig: ProxyConfiguration = {
        // https://workable.readme.io/reference/job-candidates-index
        endpoint: '/spi/v3/candidates',
        paginate: {
            type: 'link',
            link_path_in_response_body: 'paging.next',
            limit_name_in_request: 'limit',
            response_path: 'candidates',
            limit: LIMIT
        }
    };

    for await (const recordBatch of nango.paginate(proxyConfig)) {
        records.push(...recordBatch);
    }

    return records;
}

function mapActivity(activity: any): WorkableCandidateActivity {
    return {
        id: activity.id,
        action: activity.action,
        stage_name: activity.stage_name,
        created_at: activity.created_at,
        body: activity.body,
        member: activity.member,
        rating: activity.rating
    };
}
