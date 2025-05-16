import type { NangoSync, ProxyConfiguration } from '../../models';
import type { AttioDealResponse } from '../types';
import { toDeal } from '../mappers/to-deal.js';

export default async function fetchData(nango: NangoSync) {
    const config: ProxyConfiguration = {
        // https://docs.attio.com/rest-api/endpoint-reference/standard-objects/deals/list-deal-records
        endpoint: '/v2/objects/deals/records/query',
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

    for await (const page of nango.paginate<AttioDealResponse>(config)) {
        const deals = page.map(toDeal);
        await nango.batchSave(deals, 'AttioDeal');
    }
}
