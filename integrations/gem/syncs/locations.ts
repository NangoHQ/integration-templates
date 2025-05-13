import type { NangoSync, ProxyConfiguration } from '../../models';
import type { GemLocation } from '../types';
import { toLocation } from '../mappers/to-location';

export default async function fetchData(nango: NangoSync): Promise<void> {
    const proxyConfig: ProxyConfiguration = {
        // https://api.gem.com/ats/v0/reference#tag/Location/paths/~1ats~1v0~1offices~1/get
        endpoint: '/ats/v0/offices',
        paginate: {
            type: 'offset',
            offset_name_in_request: 'page',
            offset_start_value: 1,
            limit_name_in_request: 'per_page',
            limit: 100
        },
        retries: 10
    };

    for await (const locations of nango.paginate<GemLocation>(proxyConfig)) {
        const mappedLocations = locations.map(toLocation);

        if (mappedLocations.length > 0) {
            await nango.batchSave(mappedLocations, 'Location');
        }
    }
}
