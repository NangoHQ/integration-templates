import { createSync } from "nango";
import type { ProxyConfiguration } from "nango";
import { WorkableJob } from "../models.js";
import { z } from "zod";

const sync = createSync({
    description: "Fetches a list of jobs from workable",
    version: "1.0.0",
    frequency: "every 6 hours",
    autoStart: true,
    syncType: "incremental",
    trackDeletes: false,

    endpoints: [{
        method: "GET",
        path: "/workable/jobs"
    }],

    scopes: ["r_jobs"],

    models: {
        WorkableJob: WorkableJob
    },

    metadata: z.object({}),

    exec: async nango => {
        let totalRecords = 0;

        const config: ProxyConfiguration = {
            ...(nango.lastSyncDate ? { params: { created_after: nango.lastSyncDate?.toISOString() } } : {}),
            // https://workable.readme.io/reference/jobs
            endpoint: '/spi/v3/jobs',
            paginate: {
                type: 'link',
                link_path_in_response_body: 'paging.next',
                limit_name_in_request: 'limit',
                response_path: 'jobs',
                limit: 100
            }
        };
        for await (const job of nango.paginate(config)) {
            const mappedJob: WorkableJob[] = job.map(mapJob) || [];

            const batchSize: number = mappedJob.length;
            totalRecords += batchSize;
            await nango.log(`Saving batch of ${batchSize} jobs (total jobs: ${totalRecords})`);
            await nango.batchSave(mappedJob, 'WorkableJob');
        }
    }
});

export type NangoSyncLocal = Parameters<typeof sync["exec"]>[0];
export default sync;

function mapJob(job: any): WorkableJob {
    return {
        id: job.id,
        title: job.title,
        full_title: job.full_title,
        shortcode: job.shortcode,
        code: job.code,
        state: job.state,
        sample: job.sample,
        department: job.department,
        department_hierarchy: job.department_hierarchy,
        url: job.url,
        application_url: job.application_url,
        shortlink: job.shortlink,
        location: job.location,
        locations: job.locations,
        salary: job.salary,
        created_at: job.created_at
    };
}
