import type { NangoSync, ProxyConfiguration } from '../../models';
import { UserSchema } from '../schema.zod.js';

export default async function fetchData(nango: NangoSync): Promise<void> {
    const config: ProxyConfiguration = {
        // https://www.metabase.com/docs/latest/api-documentation.html#get-api-user
        endpoint: '/api/user',
        retries: 10,
        paginate: { response_path: 'results', limit: 100, type: 'offset', offset_name_in_request: 'offset', limit_name_in_request: 'limit' }
    };

    for await (const page of nango.paginate(config)) {
        const validatedUsers = page.map((user) => UserSchema.parse(user));
        await nango.batchSave(validatedUsers, 'User');
    }
}
