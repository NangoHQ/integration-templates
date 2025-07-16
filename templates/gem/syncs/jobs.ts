import { createSync } from "nango";
import type { GemJob } from '../types.js';
import { toJob } from '../mappers/to-job.js';

import type { ProxyConfiguration } from "nango";
import { Job } from "../models.js";
import { z } from "zod";

const sync = createSync({
    description: "Get a list of all jobs from Gem ATS",
    version: "0.0.1",
    frequency: "every 1h",
    autoStart: true,
    syncType: "incremental",
    trackDeletes: false,

    endpoints: [{
        method: "GET",
        path: "/jobs",
        group: "Jobs"
    }],

    models: {
        Job: Job
    },

    metadata: z.object({}),

    exec: async nango => {
        const proxyConfig: ProxyConfiguration = {
            // https://api.gem.com/ats/v0/reference#tag/Job/paths/~1ats~1v0~1jobs~1/get
            endpoint: '/ats/v0/jobs',
            paginate: {
                type: 'offset',
                offset_name_in_request: 'page',
                offset_start_value: 1,
                limit_name_in_request: 'per_page',
                limit: 100
            },
            params: {
                include_deleted: 'true',
                ...(nango.lastSyncDate && { updated_after: nango.lastSyncDate.toISOString() })
            },
            retries: 10
        };

        for await (const jobs of nango.paginate<GemJob>(proxyConfig)) {
            const mappedJobs = jobs.map(toJob);
            const deletedJobs = mappedJobs.filter((job) => job.deleted_at);
            const activeJobs = mappedJobs.filter((job) => !job.deleted_at);

            if (deletedJobs.length > 0) {
                await nango.batchDelete(deletedJobs, 'Job');
            }

            if (activeJobs.length > 0) {
                await nango.batchSave(activeJobs, 'Job');
            }
        }
    }
});

export type NangoSyncLocal = Parameters<typeof sync["exec"]>[0];
export default sync;
