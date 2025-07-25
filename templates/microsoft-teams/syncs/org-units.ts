import { createSync } from "nango";
import type { OrganizationUnitResponse } from '../types.js';

import { OrganizationalUnit } from "../models.js";
import { z } from "zod";

const sync = createSync({
    description: "Continuously fetches groups from either Microsoft 365 or Azure Active\nDirectory.\nDetails: full refresh, support deletes, goes back all time, metadata\nis not required.",
    version: "2.0.0",
    frequency: "every 6 hours",
    autoStart: true,
    syncType: "full",
    trackDeletes: false,

    endpoints: [{
        method: "GET",
        path: "/org-units",
        group: "Org Units"
    }],

    scopes: ["GroupMember.Read.All"],

    models: {
        OrganizationalUnit: OrganizationalUnit
    },

    metadata: z.object({}),

    exec: async nango => {
        // https://learn.microsoft.com/en-us/graph/api/group-list-memberof?view=graph-rest-1.0&source=recommendations&tabs=http
        await fetchAndUpdateOrgs(nango, 'v1.0/groups');
        await fetchAndUpdateOrgs(nango, 'v1.0/directory/deletedItems/microsoft.graph.group', true);
    }
});

export type NangoSyncLocal = Parameters<typeof sync["exec"]>[0];
export default sync;

async function fetchAndUpdateOrgs(nango: NangoSyncLocal, initialEndpoint: string, runDelete = false): Promise<void> {
    let endpoint = initialEndpoint;
    while (endpoint) {
        const deletedGroups: OrganizationalUnit[] = [];

        const { data }: { data: OrganizationUnitResponse } = await nango.get<OrganizationUnitResponse>({
            endpoint,
            retries: 5
        });

        if (!data) {
            await nango.log('No response from the Microsoft API');
            break;
        }

        const value = data.value;

        const units: OrganizationalUnit[] = [];

        for (const ou of value) {
            const unit: OrganizationalUnit = {
                id: ou.id,
                name: ou.displayName,
                createdAt: ou.createdDateTime,
                deletedAt: ou.deletedDateTime,
                path: null,
                parentId: null,
                parentPath: null,
                description: ou.description
            };

            if (!runDelete && unit.deletedAt) {
                deletedGroups.push(unit);

                continue;
            }

            units.push(unit);
        }

        if (runDelete) {
            await nango.batchDelete(units, 'OrganizationalUnit');
        } else {
            await nango.batchSave(units, 'OrganizationalUnit');

            if (deletedGroups.length) {
                await nango.batchDelete(deletedGroups, 'OrganizationalUnit');
            }
        }

        if (data['@odata.nextLink']) {
            endpoint = data['@odata.nextLink'];
        } else {
            break;
        }
    }
}
