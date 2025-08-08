import { createSync } from "nango";
import { toUser } from '../mappers/to-user.js';
import type { IntercomAdminUser } from '../types.js';

import type { ProxyConfiguration } from "nango";
import { User } from "../models.js";
import { z } from "zod";

const sync = createSync({
    description: "Fetches a list of admin users from Intercom",
    version: "2.0.0",
    frequency: "every 6 hours",
    autoStart: true,
    syncType: "incremental",
    trackDeletes: false,

    endpoints: [{
        method: "GET",
        path: "/users"
    }],

    models: {
        User: User
    },

    metadata: z.object({}),

    exec: async nango => {
        const config: ProxyConfiguration = {
            // https://developers.intercom.com/docs/references/rest-api/api.intercom.io/admins/listadmins
            endpoint: '/admins',
            paginate: {
                type: 'cursor',
                cursor_path_in_response: 'pages.next.starting_after',
                limit_name_in_request: 'per_page',
                cursor_name_in_request: 'starting_after',
                response_path: 'admins'
            },
            retries: 10
        };

        for await (const iUsers of nango.paginate<IntercomAdminUser>(config)) {
            const users = iUsers.map(toUser);

            await nango.batchSave(users, 'User');
        }
    }
});

export type NangoSyncLocal = Parameters<typeof sync["exec"]>[0];
export default sync;
