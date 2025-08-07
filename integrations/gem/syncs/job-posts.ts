import type { NangoSync, ProxyConfiguration } from '../../models.js';
import { toJobPost } from '../mappers/to-job-post.js';
import type { GemJobPost } from '../types.js';

export default async function fetchData(nango: NangoSync): Promise<void> {
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
