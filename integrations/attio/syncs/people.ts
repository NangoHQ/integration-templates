import type { NangoSync, ProxyConfiguration } from '../../models.js';
import type { AttioPersonResponse } from '../types.js';
import { toPerson } from '../mappers/to-person.js';

export default async function fetchData(nango: NangoSync): Promise<void> {
    const config: ProxyConfiguration = {
        // https://docs.attio.com/rest-api/endpoint-reference/standard-objects/people/list-person-records
        endpoint: '/v2/objects/people/records/query',
        method: 'POST',
        retries: 10,
        data: {
            limit: 500,
            offset: 0
        },
        paginate: {
            type: 'offset',
            limit_name_in_request: 'limit',
            offset_name_in_request: 'offset',
            offset_start_value: 0,
            response_path: 'data'
        }
    };

    for await (const page of nango.paginate<AttioPersonResponse>(config)) {
        const people = page.map(toPerson);
        await nango.batchSave(people, 'AttioPerson');
    }
}
