import { createSync } from "nango";
import type { NS_Location, NSAPI_GetResponse } from '../types.js';
import { paginate } from '../helpers/pagination.js';
import { formatDate } from '../helpers/utils.js';

import type { ProxyConfiguration } from "nango";
import { NetsuiteLocation, NetsuiteMetadata } from "../models.js";

const retries = 3;

const sync = createSync({
    description: "Fetches all locations in Netsuite",
    version: "2.0.0",
    frequency: "every hour",
    autoStart: false,
    syncType: "incremental",
    trackDeletes: false,

    endpoints: [{
        method: "GET",
        path: "/locations"
    }],

    models: {
        NetsuiteLocation: NetsuiteLocation
    },

    metadata: NetsuiteMetadata,

    exec: async nango => {
        const lastModifiedDateQuery = nango.lastSyncDate ? `lastModifiedDate ON_OR_AFTER "${await formatDate(nango.lastSyncDate, nango)}"` : undefined;
        const proxyConfig: ProxyConfiguration = {
            // https://system.netsuite.com/help/helpcenter/en_US/APIs/REST_API_Browser/record/v1/2022.1/index.html#tag-location
            endpoint: '/location',
            retries,
            ...(lastModifiedDateQuery ? { params: { q: lastModifiedDateQuery } } : {})
        };
        for await (const locations of paginate<{ id: string }>({ nango, proxyConfig })) {
            await nango.log('Listed locations', { total: locations.length });

            const mappedLocations: NetsuiteLocation[] = [];
            for (const locationLink of locations) {
                const location: NSAPI_GetResponse<NS_Location> = await nango.get({
                    endpoint: `/location/${locationLink.id}`,
                    params: {
                        expandSubResources: 'true'
                    },
                    retries
                });
                if (!location.data) {
                    await nango.log('Location not found', { id: locationLink.id });
                    continue;
                }

                const mappedLocation: NetsuiteLocation = {
                    id: location.data.id,
                    isInactive: location.data.isInactive,
                    name: location.data.name,
                    lastModifiedDate: location.data.lastModifiedDate,
                    address: {
                        address1: location.data.mainAddress.addr1,
                        addressee: location.data.mainAddress.addressee,
                        addressText: location.data.mainAddress.addrText,
                        city: location.data.mainAddress.city,
                        country: location.data.mainAddress.country.refName,
                        state: location.data.mainAddress.state,
                        zip: location.data.mainAddress.zip
                    },
                    returnAddress: {
                        addressText: location.data.returnAddress.addrText,
                        country: location.data.returnAddress.country.refName
                    },
                    timeZone: location.data.timeZone?.refName ?? null,
                    useBins: location.data.useBins
                };

                mappedLocations.push(mappedLocation);
            }
            await nango.batchSave(mappedLocations, 'NetsuiteLocation');
        }
    }
});

export type NangoSyncLocal = Parameters<typeof sync["exec"]>[0];
export default sync;
