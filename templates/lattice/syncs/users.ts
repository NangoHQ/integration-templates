import { createSync } from "nango";
import type { LatticeUser } from '../types.js';

import type { ProxyConfiguration } from "nango";
import { User } from "../models.js";
import { z } from "zod";

const sync = createSync({
    description: "Fetches a list of users from Lattice",
    version: "1.0.0",
    frequency: "every day",
    autoStart: true,
    syncType: "full",
    trackDeletes: true,

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
        const proxyConfiguration: ProxyConfiguration = {
            // https://developers.lattice.com/reference/api_users
            endpoint: '/developer/v1/users',
            paginate: {
                type: 'cursor',
                cursor_name_in_request: 'startingAfter',
                cursor_path_in_response: 'endingCursor',
                response_path: 'data',
                limit: 100,
                limit_name_in_request: 'limit'
            },
            params: {
                state: 'ACTIVE'
            }
        };

        for await (const latticeUsers of nango.paginate<LatticeUser>(proxyConfiguration)) {
            const users: User[] = latticeUsers.map((latticeUser: LatticeUser) => {
                const [firstName = '', ...lastNameParts] = latticeUser.name?.split(' ') || [];
                const lastName = lastNameParts.join(' ') || '';

                return {
                    id: latticeUser.id?.toString() || '',
                    firstName,
                    lastName,
                    email: latticeUser.email || ''
                };
            });

            await nango.batchSave(users, 'User');
        }
    }
});

export type NangoSyncLocal = Parameters<typeof sync["exec"]>[0];
export default sync;
