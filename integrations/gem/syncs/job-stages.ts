import type { ProxyConfiguration, NangoSync } from '../../models';
import type { GemJobStage } from '../types';
import { toJobStage } from '../mappers/to-job-stage.js';

export default async function fetchData(nango: NangoSync): Promise<void> {
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
