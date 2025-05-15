import type { NangoSync, ProxyConfiguration } from '../../models.js';
import type { AttioResponse, AttioObjectResponse } from '../types.js';
import { toObject } from '../mappers/to-object.js';

export default async function fetchData(nango: NangoSync): Promise<void> {
    const config: ProxyConfiguration = {
        // https://docs.attio.com/rest-api/endpoint-reference/objects/list-objects
        endpoint: '/v2/objects',
        method: 'GET',
        retries: 10
    };

    const response = await nango.get<AttioResponse<AttioObjectResponse>>(config);
    const objects = response.data.data.map(toObject);
    await nango.batchSave(objects, 'AttioObject');
}
