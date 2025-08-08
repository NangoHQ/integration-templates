import { createSync } from "nango";
import type { ProxyConfiguration } from "nango";
import type { WorkableCandidate} from "../models.js";
import { WorkableJobsCandidate } from "../models.js";
import { z } from "zod";

const LIMIT = 100;

const sync = createSync({
    description: "Fetches a list of candidates for the specified job from workable",
    version: "1.0.0",
    frequency: "every 6 hours",
    autoStart: true,
    syncType: "full",
    trackDeletes: false,

    endpoints: [{
        method: "GET",
        path: "/workable/jobs-candidates"
    }],

    scopes: ["r_jobs"],

    models: {
        WorkableJobsCandidate: WorkableJobsCandidate
    },

    metadata: z.object({}),

    exec: async nango => {
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
                await nango.batchSave(mappedCandidate, 'WorkableJobsCandidate');
            }
        }
    }
});

export type NangoSyncLocal = Parameters<typeof sync["exec"]>[0];
export default sync;

async function getAllJobs(nango: NangoSyncLocal) {
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
