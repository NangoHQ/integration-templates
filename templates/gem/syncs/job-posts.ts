import { createSync } from "nango";
import { toJobPost } from '../mappers/to-job-post.js';
import type { GemJobPost } from '../types.js';

import type { ProxyConfiguration } from "nango";
import { JobPost } from "../models.js";
import { z } from "zod";

const sync = createSync({
    description: "Get a list of all job posts from Gem ATS",
    version: "1.0.0",
    frequency: "every 1h",
    autoStart: true,
    syncType: "incremental",
    trackDeletes: false,

    endpoints: [{
        method: "GET",
        path: "/job-posts",
        group: "Job Posts"
    }],

    models: {
        JobPost: JobPost
    },

    metadata: z.object({}),

    exec: async nango => {
        const proxyConfig: ProxyConfiguration = {
            // https://api.gem.com/ats/v0/reference#tag/Job-Post/paths/~1ats~1v0~1job_posts~1/get
            endpoint: '/ats/v0/job_posts',
            paginate: {
                type: 'offset',
                offset_name_in_request: 'page',
                offset_start_value: 1,
                limit_name_in_request: 'per_page',
                limit: 100
            },
            params: {
                ...(nango.lastSyncDate && { updated_after: nango.lastSyncDate.toISOString() })
            },
            retries: 10
        };

        for await (const jobPosts of nango.paginate<GemJobPost>(proxyConfig)) {
            const mappedJobPosts = jobPosts.map(toJobPost);
            const deletedJobPosts = mappedJobPosts.filter((post) => post.deleted_at);
            const activeJobPosts = mappedJobPosts.filter((post) => !post.deleted_at);

            if (deletedJobPosts.length > 0) {
                await nango.batchDelete(deletedJobPosts, 'JobPost');
            }

            if (activeJobPosts.length > 0) {
                await nango.batchSave(activeJobPosts, 'JobPost');
            }
        }
    }
});

export type NangoSyncLocal = Parameters<typeof sync["exec"]>[0];
export default sync;
