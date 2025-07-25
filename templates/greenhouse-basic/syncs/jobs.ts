import { createSync } from "nango";
import type { ProxyConfiguration } from "nango";
import { GreenhouseJob } from "../models.js";
import { z } from "zod";

const sync = createSync({
    description: "Fetches a list of all organization's jobs from greenhouse",
    version: "1.0.0",
    frequency: "every 6 hours",
    autoStart: true,
    syncType: "incremental",
    trackDeletes: false,

    endpoints: [{
        method: "GET",
        path: "/greenhouse-basic/jobs"
    }],

    models: {
        GreenhouseJob: GreenhouseJob
    },

    metadata: z.object({}),

    exec: async nango => {
        let totalRecords = 0;

        const config: ProxyConfiguration = {
            ...(nango.lastSyncDate ? { params: { created_after: nango.lastSyncDate?.toISOString() } } : {}),
            // https://developers.greenhouse.io/harvest.html#get-list-jobs
            endpoint: '/v1/jobs',
            paginate: {
                type: 'link',
                limit_name_in_request: 'per_page',
                link_rel_in_response_header: 'next',
                limit: 100
            }
        };
        for await (const job of nango.paginate(config)) {
            const mappedJob: GreenhouseJob[] = job.map(mapJob) || [];

            const batchSize: number = mappedJob.length;
            totalRecords += batchSize;
            await nango.log(`Saving batch of ${batchSize} job(s) (total job(s): ${totalRecords})`);
            await nango.batchSave(mappedJob, 'GreenhouseJob');
        }
    }
});

export type NangoSyncLocal = Parameters<typeof sync["exec"]>[0];
export default sync;

function mapJob(job: any): GreenhouseJob {
    return {
        id: job.id,
        name: job.name,
        requisition_id: job.requisition_id,
        notes: job.notes,
        confidential: job.confidential,
        status: job.status,
        created_at: job.created_at,
        opened_at: job.opened_at,
        closed_at: job.closed_at,
        updated_at: job.updated_at,
        is_template: job.is_template,
        copied_from_id: job.copied_from_id,
        departments: job.departments,
        offices: job.offices,
        custom_fields: job.custom_fields,
        keyed_custom_fields: job.keyed_custom_fields,
        hiring_team: job.hiring_team,
        openings: job.openings
    };
}
