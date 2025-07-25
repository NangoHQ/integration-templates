import { createSync } from "nango";
import { toUser } from '../mappers/to-user.js';
import type { KeeperUser } from '../types.js';

import type { ProxyConfiguration } from "nango";
import { User } from "../models.js";
import { z } from "zod";

/**
 * Fetches Keeper users, maps them to Nango User objects,
 * and saves the processed contacts using NangoSync.
 *
 * This function handles pagination and ensures that all contacts are fetched,
 * transformed, and stored.
 *
 * For endpoint documentation, refer to:
 * https://docs.keeper.io/en/enterprise-guide/user-and-team-provisioning/automated-provisioning-with-scim
 *
 * @param nango An instance of NangoSync for synchronization tasks.
 * @returns Promise that resolves when all users are fetched and saved.
 */
const sync = createSync({
    description: "Fetches the list of users from Keeper",
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
            // https://docs.keeper.io/en/enterprise-guide/user-and-team-provisioning/automated-provisioning-with-scim
            endpoint: '/Users',
            paginate: {
                type: 'offset',
                offset_name_in_request: 'startIndex', // startIndex is 1-based
                offset_start_value: 1,
                offset_calculation_method: 'per-page',
                limit_name_in_request: 'count',
                response_path: 'Resources',
                limit: 100
            },
            retries: 10
        };

        for await (const keeperUsers of nango.paginate<KeeperUser>(config)) {
            const users = keeperUsers.map(toUser);

            await nango.batchSave(users, 'User');
        }
    }
});

export type NangoSyncLocal = Parameters<typeof sync["exec"]>[0];
export default sync;
