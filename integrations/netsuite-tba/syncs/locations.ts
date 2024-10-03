import type { NangoSync, NetsuiteLocation, ProxyConfiguration } from '../../models';
import type { NS_Location, NSAPI_GetResponse } from '../types';
import { paginate } from '../helpers/pagination.js';

const retries = 3;

export default async function fetchData(nango: NangoSync): Promise<void> {
    const proxyConfig: ProxyConfiguration = {
        // https://system.netsuite.com/help/helpcenter/en_US/APIs/REST_API_Browser/record/v1/2022.1/index.html#tag-location
        endpoint: '/location',
        retries
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
                timeZone: location.data.timeZone.refName,
                useBins: location.data.useBins
            };

            mappedLocations.push(mappedLocation);
        }
        await nango.batchSave<NetsuiteLocation>(mappedLocations, 'NetsuiteLocation');
    }
}
