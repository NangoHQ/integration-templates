import { createSync } from 'nango';
import type { GemApplication } from '../types.js';
import { toApplication } from '../mappers/to-application.js';

import type { ProxyConfiguration } from 'nango';
import { Application } from '../models.js';
import { z } from 'zod';

const sync = createSync({
    description: 'Get a list of all applications from Gem ATS',
    version: '1.0.0',
    frequency: 'every 1h',
    autoStart: true,
    syncType: 'incremental',
    trackDeletes: false,

    endpoints: [
        {
            method: 'GET',
            path: '/applications',
            group: 'Applications'
        }
    ],

    models: {
        Application: Application
    },

    metadata: z.object({}),

    exec: async (nango) => {
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
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
