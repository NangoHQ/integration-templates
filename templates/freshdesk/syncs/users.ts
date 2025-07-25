import { createSync } from "nango";
import type { FreshdeskAgent } from '../types.js';

import type { ProxyConfiguration } from "nango";
import { User } from "../models.js";
import { z } from "zod";

const sync = createSync({
    description: "Fetches the list of users",
    version: "2.0.0",
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
            // https://developer.freshdesk.com/api/#list_all_agents
            endpoint: '/api/v2/agents',
            retries: 10,
            paginate: {
                type: 'link',
                limit_name_in_request: 'per_page',
                link_rel_in_response_header: 'next',
                limit: 100
            }
        };

        for await (const freshdeskUsers of nango.paginate<FreshdeskAgent>(proxyConfiguration)) {
            const users: User[] = freshdeskUsers.map(mapUser) || [];

            await nango.batchSave(users, 'User');
        }
    }
});

export type NangoSyncLocal = Parameters<typeof sync["exec"]>[0];
export default sync;

/**
 * Maps a Freshdesk user object to a Nango User object.
 */

function mapUser(user: FreshdeskAgent): User {
    const [firstName = '', lastName = ''] = (user?.contact?.name ?? '').split(' ');

    return {
        id: user.id.toString(),
        email: user.contact.email,
        firstName,
        lastName
    };
}
