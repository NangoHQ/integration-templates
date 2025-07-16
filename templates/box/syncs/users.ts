import { createSync } from "nango";
import type { BoxUser } from '../types.js';

import type { ProxyConfiguration } from "nango";
import { User } from "../models.js";
import { z } from "zod";

/**
 * Fetches user data from the Box API and saves it in batches.
 */
const sync = createSync({
    description: "Fetches a list of users from Box. Requires an enterprise account.",
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
        let totalRecords = 0;

        const config: ProxyConfiguration = {
            // https://developer.box.com/reference/get-users/
            endpoint: '/2.0/users',
            params: {
                // Box API has two pagination options:
                // 1. offset (default)
                // 2. marker (next_marker and prev_marker)
                userMarker: 'true'
            },
            paginate: {
                type: 'cursor',
                cursor_path_in_response: 'next_marker',
                limit_name_in_request: 'limit',
                cursor_name_in_request: 'marker',
                response_path: 'entries',
                limit: 100
            }
        };

        for await (const boxUsers of nango.paginate(config)) {
            const batchSize: number = boxUsers.length || 0;
            totalRecords += batchSize;

            const users: User[] = boxUsers.map(mapUser) || [];

            await nango.log(`Saving batch of ${batchSize} users (total users: ${totalRecords})`);

            await nango.batchSave(users, 'User');
        }
    }
});

export type NangoSyncLocal = Parameters<typeof sync["exec"]>[0];
export default sync;

/**
 * Maps a BoxUser object to a User object (Nango User type).
 */
function mapUser(user: BoxUser): User {
    const [firstName, lastName] = user.name.split(' ');

    return {
        id: user.id,
        email: user.login,
        firstName: firstName || '',
        lastName: lastName || ''
    };
}
