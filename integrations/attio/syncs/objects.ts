import type { NangoSync, ProxyConfiguration, AttioObject } from '../../models.js';
import type { AttioResponse } from '../types.js';

export default async function fetchData(nango: NangoSync): Promise<void> {
    const config: ProxyConfiguration = {
        // https://docs.attio.com/rest-api/endpoint-reference/objects/list-objects
        endpoint: '/v2/objects',
        method: 'GET',
        retries: 10
    };

    const response = await nango.get<AttioResponse<AttioObject>>(config);
    await nango.batchSave(response.data.data, 'AttioObject');
}
