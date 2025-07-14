import { createSync } from "nango";
import type { AircallUser } from '../types.js';

import type { ProxyConfiguration } from "nango";
import { User } from "../../models.js";
import { z } from "zod";

const sync = createSync({
    description: "Fetches a list of users from Aircall.",
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
        const config: ProxyConfiguration = {
            // https://developer.aircall.io/api-references/#list-all-users
            endpoint: '/v1/users',
            retries: 10,
            paginate: {
                response_path: 'users'
            }
        };

        for await (const aUsers of nango.paginate<AircallUser>(config)) {
            const users: User[] = aUsers.map((aUser: AircallUser) => {
                const [firstName, lastName] = aUser.name.split(' ');
                const user: User = {
                    id: aUser.id.toString(),
                    firstName: firstName || '',
                    lastName: lastName || '',
                    email: aUser.email
                };

                return user;
            });

            await nango.batchSave(users, 'User');
        }
    }
});

export type NangoSyncLocal = Parameters<typeof sync["exec"]>[0];
export default sync;
