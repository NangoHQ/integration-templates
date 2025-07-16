import { createSync } from "nango";
import type { RecruiterFlowJobRemoteStatusResponse } from '../types.js';

import type { ProxyConfiguration } from "nango";
import { RecruiterFlowJobRemoteStatus } from "../models.js";
import { z } from "zod";

const sync = createSync({
    description: "Syncs all job remote statuses from RecruiterFlow",
    version: "1.0.0",
    frequency: "every hour",
    autoStart: true,
    syncType: "full",
    trackDeletes: true,

    endpoints: [{
        method: "GET",
        path: "/job-remote-statuses",
        group: "Jobs"
    }],

    models: {
        RecruiterFlowJobRemoteStatus: RecruiterFlowJobRemoteStatus
    },

    metadata: z.object({}),

    exec: async nango => {
        const proxyConfig: ProxyConfiguration = {
            // https://recruiterflow.com/api#/Job%20APIs/get_api_external_job_remote_status_list
            endpoint: '/api/external/job-remote-status/list',
            retries: 10
        };

        const response = await nango.get<{ data: RecruiterFlowJobRemoteStatusResponse[] }>(proxyConfig);
        const remoteStatuses = response.data.data;

        await nango.batchSave(remoteStatuses.map(toJobRemoteStatus), 'RecruiterFlowJobRemoteStatus');
    }
});

export type NangoSyncLocal = Parameters<typeof sync["exec"]>[0];
export default sync;

function toJobRemoteStatus(record: RecruiterFlowJobRemoteStatusResponse): RecruiterFlowJobRemoteStatus {
    return {
        id: record.id,
        name: record.name
    };
}
