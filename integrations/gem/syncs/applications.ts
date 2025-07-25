import type { NangoSync, ProxyConfiguration } from '../../models.js';
import type { GemApplication } from '../types.js';
import { toApplication } from '../mappers/to-application.js';

export default async function fetchData(nango: NangoSync): Promise<void> {
    const proxyConfig: ProxyConfiguration = {
        // https://api.gem.com/ats/v0/reference#tag/Application/paths/~1ats~1v0~1applications~1/get
        endpoint: '/ats/v0/applications',
        paginate: {
            type: 'offset',
            offset_name_in_request: 'page',
            offset_start_value: 1,
            limit_name_in_request: 'per_page',
            limit: 100
        },
        params: {
            include_deleted: 'true',
            ...(nango.lastSyncDate && { last_activity_after: nango.lastSyncDate.toISOString() })
        },
        retries: 10
    };

    for await (const applications of nango.paginate<GemApplication>(proxyConfig)) {
        const mappedApplications = applications.map(toApplication);
        const deletedApplications = mappedApplications.filter((app) => app.deleted_at);
        const activeApplications = mappedApplications.filter((app) => !app.deleted_at);

        if (deletedApplications.length > 0) {
            await nango.batchDelete(deletedApplications, 'Application');
        }

        if (activeApplications.length > 0) {
            await nango.batchSave(activeApplications, 'Application');
        }
    }
}
