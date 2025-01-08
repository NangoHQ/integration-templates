import type { NangoSync, ProxyConfiguration } from '../../models';

export default async function fetchData(nango: NangoSync): Promise<void> {
    const config: ProxyConfiguration = {
        // https://www.metabase.com/docs/latest/api-documentation.html#get-api-user
        endpoint: '/api/user',
        retries: 10,
        paginate: { response_path: 'data', limit: 100, type: 'offset', offset_name_in_request: 'offset', limit_name_in_request: 'limit' }
    };

    for await (const page of nango.paginate(config)) {
        const validatedUsers = page.map((user) => {
            return {
                id: user.id.toString(),
                firstName: user.first_name,
                lastName: user.last_name,
                email: user.email
            };
        });
        await nango.log('111');
        await nango.log(validatedUsers);
        await nango.batchSave(validatedUsers, 'User');
    }
}
