import { createSync } from "nango";
import type { GemJobStage } from '../types.js';
import { toJobStage } from '../mappers/to-job-stage.js';

import type { ProxyConfiguration } from "nango";
import { JobStage } from "../models.js";
import { z } from "zod";

const sync = createSync({
    description: "Get a list of all job stages from Gem ATS",
    version: "1.0.0",
    frequency: "every 1h",
    autoStart: true,
    syncType: "incremental",
    trackDeletes: false,

    endpoints: [{
        method: "GET",
        path: "/job-stages",
        group: "Job Stages"
    }],

    models: {
        JobStage: JobStage
    },

    metadata: z.object({}),

    exec: async nango => {
        const proxyConfig: ProxyConfiguration = {
            // https://api.gem.com/ats/v0/reference#tag/Job-Stage/paths/~1ats~1v0~1job_stages~1/get
            endpoint: '/ats/v0/job_stages',
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

        for await (const jobStages of nango.paginate<GemJobStage>(proxyConfig)) {
            const mappedJobStages = jobStages.map(toJobStage);
            const deletedJobStages = mappedJobStages.filter((stage) => stage.deleted_at);
            const activeJobStages = mappedJobStages.filter((stage) => !stage.deleted_at);

            if (deletedJobStages.length > 0) {
                await nango.batchDelete(deletedJobStages, 'JobStage');
            }

            if (activeJobStages.length > 0) {
                await nango.batchSave(activeJobStages, 'JobStage');
            }
        }
    }
});

export type NangoSyncLocal = Parameters<typeof sync["exec"]>[0];
export default sync;
