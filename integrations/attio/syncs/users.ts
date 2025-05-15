import type { NangoSync, ProxyConfiguration } from '../../models.js';
import type { AttioUserRecord } from '../types.js';

export default async function fetchData(nango: NangoSync): Promise<void> {
    const config: ProxyConfiguration = {
        endpoint: '/v2/objects/users/records/query',
        method: 'POST',
        retries: 10,
        data: {
            limit: 50
        },
        paginate: {
            type: 'offset',
            limit_name_in_request: 'limit',
            offset_name_in_request: 'offset',
            response_path: 'data'
        }
    };

    for await (const users of nango.paginate<AttioUserRecord>(config)) {
        await nango.batchSave(users, 'AttioUser');
    }
}
