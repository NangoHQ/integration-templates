import { createSync } from "nango";
import type { ProxyConfiguration } from "nango";
import { PipeDriveOrganization } from "../models.js";
import { z } from "zod";

const sync = createSync({
    description: "Fetches a list of organizations from pipedrive",
    version: "0.0.1",
    frequency: "every hour",
    autoStart: true,
    syncType: "incremental",
    trackDeletes: false,

    endpoints: [{
        method: "GET",
        path: "/pipedrive/organizations"
    }],

    scopes: ["contacts:read"],

    models: {
        PipeDriveOrganization: PipeDriveOrganization
    },

    metadata: z.object({}),

    exec: async nango => {
        let totalRecords = 0;

        const config: ProxyConfiguration = {
            // https://developers.pipedrive.com/docs/api/v1/Organizations#getOrganizationsCollection
            endpoint: '/v1/organizations/collection',
            ...(nango.lastSyncDate ? { params: { since: nango.lastSyncDate?.toISOString() } } : {}),
            paginate: {
                type: 'cursor',
                cursor_path_in_response: 'additional_data.next_cursor',
                cursor_name_in_request: 'cursor',
                limit_name_in_request: 'limit',
                response_path: 'data',
                limit: 100
            }
        };
        for await (const organization of nango.paginate(config)) {
            const mappedOrganization: PipeDriveOrganization[] = organization.map(mapOrganization) || [];
            // Save Organization
            const batchSize: number = mappedOrganization.length;
            totalRecords += batchSize;
            await nango.log(`Saving batch of ${batchSize} organizations (total organizations: ${totalRecords})`);
            await nango.batchSave(mappedOrganization, 'PipeDriveOrganization');
        }
    }
});

export type NangoSyncLocal = Parameters<typeof sync["exec"]>[0];
export default sync;

function mapOrganization(organization: any): PipeDriveOrganization {
    return {
        id: organization.id,
        owner_id: organization.owner_id,
        name: organization.name,
        active_flag: organization.active_flag,
        update_time: organization.update_time,
        delete_time: organization.delete_time,
        add_time: organization.add_time,
        visible_to: organization.visible_to,
        label: organization.label,
        address: organization.address,
        address_subpremise: organization.address_subpremise,
        address_street_number: organization.address_street_number,
        address_route: organization.address_route,
        address_sublocality: organization.address_sublocality,
        address_locality: organization.address_locality,
        address_admin_area_level_1: organization.address_admin_area_level_1,
        address_admin_area_level_2: organization.address_admin_area_level_2,
        address_country: organization.address_country,
        address_postal_code: organization.address_postal_code,
        address_formatted_address: organization.address_formatted_address,
        cc_email: organization.cc_email
    };
}
