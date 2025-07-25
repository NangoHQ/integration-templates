import { createSync } from "nango";
import type { BillUser } from '../types.js';
import { getHeaders } from '../helpers/get-headers.js';

import type { ProxyConfiguration } from "nango";
import { User } from "../models.js";
import { z } from "zod";

const sync = createSync({
    description: "Fetches a list of users from Bill sandbox",
    version: "1.0.0",
    frequency: "every day",
    autoStart: true,
    syncType: "incremental",
    trackDeletes: false,

    endpoints: [{
        method: "GET",
        path: "/users",
        group: "Users"
    }],

    models: {
        User: User
    },

    metadata: z.object({}),

    exec: async nango => {
        const headers = await getHeaders(nango);

        const filters = ['archived:eq:false'];

        if (nango.lastSyncDate) {
            filters.push(`updatedTime:gte:"${nango.lastSyncDate.toISOString()}"`);
        }

        const config: ProxyConfiguration = {
            // https://developer.bill.com/reference/listorganizationusers
            endpoint: '/v3/users',
            retries: 10,
            params: {
                filters: filters.join(',')
            },
            paginate: {
                type: 'cursor',
                cursor_name_in_request: 'page',
                cursor_path_in_response: 'nextPage',
                response_path: 'results',
                limit_name_in_request: 'max',
                limit: 100
            },
            headers: {
                sessionId: headers.sessionId,
                devKey: headers.devKey
            }
        };

        for await (const billUsers of nango.paginate<BillUser>(config)) {
            const users: User[] = billUsers.map((user: BillUser) => {
                return {
                    id: user.id,
                    firstName: user.firstName,
                    lastName: user.lastName,
                    email: user.email
                };
            });

            await nango.batchSave(users, 'User');
        }
    }
});

export type NangoSyncLocal = Parameters<typeof sync["exec"]>[0];
export default sync;
