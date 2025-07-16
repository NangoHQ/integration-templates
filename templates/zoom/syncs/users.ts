import { createSync } from "nango";
import type { ZoomUser } from '../types.js';

import type { ProxyConfiguration } from "nango";
import { User } from "../models.js";
import { z } from "zod";

const sync = createSync({
    description: "Fetches a list of users from Zoom",
    version: "0.0.1",
    frequency: "every day",
    autoStart: true,
    syncType: "full",
    trackDeletes: true,

    endpoints: [{
        method: "GET",
        path: "/users",
        group: "Users"
    }],

    scopes: ["user:read", "user:read:admin"],

    models: {
        User: User
    },

    metadata: z.object({}),

    exec: async nango => {
        const config: ProxyConfiguration = {
            // https://developers.zoom.us/docs/api/rest/reference/user/methods/#operation/users
            endpoint: 'users',
            retries: 10,
            paginate: {
                type: 'cursor',
                cursor_name_in_request: 'next_page_token',
                cursor_path_in_response: 'next_page_token',
                response_path: 'users',
                limit_name_in_request: 'page_size'
            }
        };

        for await (const zUsers of nango.paginate<ZoomUser>(config)) {
            const users: User[] = zUsers.map((zUser: ZoomUser) => {
                return {
                    id: zUser.id.toString(),
                    firstName: zUser.first_name,
                    lastName: zUser.last_name,
                    email: zUser.email
                };
            });

            await nango.batchSave(users, 'User');
        }
    }
});

export type NangoSyncLocal = Parameters<typeof sync["exec"]>[0];
export default sync;
