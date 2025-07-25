import { createSync } from "nango";
import { getOrganizationId } from '../helpers/get-organization-id.js';
import type { CalendlyOrganizationMember } from '../types.js';

import type { ProxyConfiguration } from "nango";
import { User } from "../models.js";
import { z } from "zod";

/**
 * Fetches user data from the Calendly API and saves it in batches.
 */
const sync = createSync({
    description: "Fetches a list of users from Calendly",
    version: "3.0.0",
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
        const organizationId = await getOrganizationId(nango);
        const proxyConfiguration: ProxyConfiguration = {
            // https://developer.calendly.com/api-docs/eaed2e61a6bc3-list-organization-memberships
            endpoint: `/organization_memberships`,
            params: {
                organization: `https://api.calendly.com/organizations/${organizationId}`
            },
            paginate: {
                response_path: 'collection',
                limit_name_in_request: 'count',
                limit: 100
            }
        };

        for await (const orgMemberships of nango.paginate(proxyConfiguration)) {
            const batchSize: number = orgMemberships.length || 0;
            totalRecords += batchSize;

            const users: User[] = orgMemberships.map(mapUser) || [];

            await nango.log(`Saving batch of ${batchSize} users (total users: ${totalRecords})`);

            await nango.batchSave(users, 'User');
        }
    }
});

export type NangoSyncLocal = Parameters<typeof sync["exec"]>[0];
export default sync;

/**
 * Maps a CalendlyOrganizationMember object to a User object (Nango User type).
 */
function mapUser(orgMember: CalendlyOrganizationMember): User {
    const { name, uri, email } = orgMember.user;
    // the id, .i.e., AAAAAAAAAAAAAAAA can be extracted from the
    // uri https://api.calendly.com/users/AAAAAAAAAAAAAAAA
    const id = uri.split('/').pop() ?? '';
    const [firstName = '', lastName = ''] = name.split(' ');

    return {
        id,
        email,
        firstName,
        lastName
    };
}
