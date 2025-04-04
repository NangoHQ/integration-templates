import type { WorkableCandidate, NangoSync, ProxyConfiguration } from '../../models';

const LIMIT = 100;

export default async function fetchData(nango: NangoSync) {
    let totalRecords = 0;

    const jobs: any[] = await getAllJobs(nango);

    for (const job of jobs) {
        const config: ProxyConfiguration = {
            // https://workable.readme.io/reference/job-candidates-create
            endpoint: `/spi/v3/jobs/${job.shortcode}/candidates`,
            paginate: {
                type: 'link',
                link_path_in_response_body: 'paging.next',
                limit_name_in_request: 'limit',
                response_path: 'candidates',
                limit: LIMIT
            }
        };
        for await (const candidate of nango.paginate(config)) {
            const mappedCandidate: WorkableCandidate[] = candidate.map(mapCandidate) || [];
            // Save candidates
            const batchSize: number = mappedCandidate.length;
            totalRecords += batchSize;
            await nango.log(`Saving batch of ${batchSize} candidate(s) for job ${job.shortcode} (total candidates: ${totalRecords})`);
            await nango.batchSave(mappedCandidate, 'WorkableCandidate');
        }
    }
}

async function getAllJobs(nango: NangoSync) {
    const records: any[] = [];
    const config: ProxyConfiguration = {
        // https://workable.readme.io/reference/jobs
        endpoint: '/spi/v3/jobs',
        paginate: {
            type: 'link',
            link_path_in_response_body: 'paging.next',
            limit_name_in_request: 'limit',
            response_path: 'jobs',
            limit: LIMIT
        }
    };

    for await (const recordBatch of nango.paginate(config)) {
        records.push(...recordBatch);
    }

    return records;
}

function mapCandidate(candidate: any): WorkableCandidate {
    return {
        id: candidate.id,
        name: candidate.name,
        firstname: candidate.firstname,
        lastname: candidate.lastname,
        headline: candidate.headline,
        account: candidate.account,
        job: candidate.job,
        stage: candidate.stage,
        disqualified: candidate.disqualified,
        disqualification_reason: candidate.disqualification_reason,
        hired_at: candidate.hired_at,
        sourced: candidate.sourced,
        profile_url: candidate.profile_url,
        address: candidate.address,
        phone: candidate.phone,
        email: candidate.email,
        domain: candidate.domain,
        created_at: candidate.created_at,
        updated_at: candidate.updated_after
    };
}
