import { createSync } from "nango";
import { OrganizationalUnit } from "../models.js";
import { z } from "zod";

interface OrganizationUnit {
    kind: string;
    etag: string;
    name: string;
    description: string;
    orgUnitPath: string;
    orgUnitId: string;
    parentOrgUnitPath: string;
    parentOrgUnitId: string;
}
interface OrganizationUnitResponse {
    kind: string;
    etag: string;
    organizationUnits: OrganizationUnit[];
}

const sync = createSync({
    description: "Sync all workspace org units",
    version: "1.0.0",
    frequency: "every 6 hours",
    autoStart: true,
    syncType: "full",
    trackDeletes: true,

    endpoints: [{
        method: "GET",
        path: "/google/workspace-org-unit"
    }],

    scopes: [
        "https://www.googleapis.com/auth/admin.directory.orgunit.readonly",
        "https://www.googleapis.com/auth/admin.directory.user.readonly"
    ],

    models: {
        OrganizationalUnit: OrganizationalUnit
    },

    metadata: z.object({}),

    exec: async nango => {
        const endpoint = '/admin/directory/v1/customer/my_customer/orgunits';
        let pageToken: string | undefined;

        const rootUnit: OrganizationalUnit = {
            name: '{Root Directory}',
            description: 'Root Directory',
            path: '/',
            id: '',
            parentPath: null,
            parentId: null,
            createdAt: null,
            deletedAt: null
        };

        do {
            const params = pageToken ? { type: 'all', pageToken } : { type: 'all' };

            const response = await nango.get<OrganizationUnitResponse & { nextPageToken?: string }>({
                baseUrlOverride: 'https://admin.googleapis.com',
                endpoint,
                params,
                retries: 5
            });

            if (!response) {
                await nango.log('No response from the Google API');
                return;
            }

            const { data } = response;

            if (data.organizationUnits) {
                if (
                    !rootUnit.id &&
                    data.organizationUnits.length > 0 &&
                    data.organizationUnits[0]?.parentOrgUnitId &&
                    data.organizationUnits[0]?.parentOrgUnitPath === '/'
                ) {
                    rootUnit.id = data.organizationUnits[0].parentOrgUnitId;

                    await nango.batchSave([rootUnit], 'OrganizationalUnit');
                }

                const units: OrganizationalUnit[] = data.organizationUnits.map((ou: OrganizationUnit) => {
                    const unit: OrganizationalUnit = {
                        name: ou.name,
                        description: ou.description,
                        path: ou.orgUnitPath,
                        id: ou.orgUnitId,
                        parentPath: ou.parentOrgUnitPath,
                        parentId: ou.parentOrgUnitId,
                        createdAt: null,
                        deletedAt: null
                    };

                    return unit;
                });

                await nango.batchSave(units, 'OrganizationalUnit');
            }

            pageToken = response.data.nextPageToken;
        } while (pageToken);
    }
});

export type NangoSyncLocal = Parameters<typeof sync["exec"]>[0];
export default sync;
