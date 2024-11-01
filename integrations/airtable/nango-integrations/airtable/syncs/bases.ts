import type { NangoSync, ProxyConfiguration, Base } from '../../models';

export default async function fetchData(nango: NangoSync): Promise<void> {
    const config: ProxyConfiguration = {
        // https://airtable.com/developers/web/api/list-bases
        endpoint: '/v0/meta/bases',
        retries: 10,
        paginate: {
            type: 'cursor',
            cursor_path_in_response: 'offset',
            cursor_name_in_request: 'offset',
            response_path: 'bases'
        }
    };

    for await (const bases of nango.paginate<Base>(config)) {
        await nango.batchSave(bases, 'Base');
    }
}
