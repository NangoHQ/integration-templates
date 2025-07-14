import type { User, IdEntity, NangoAction, ProxyConfiguration } from '../../models.js';
import type { MetabaseUser } from '../types.js';

export default async function runAction(nango: NangoAction, input: IdEntity): Promise<User> {
    if (input.id <= 0) {
        throw new Error('User ID must be an integer greater than zero.');
    }

    const config: ProxyConfiguration = {
        // https://www.metabase.com/docs/latest/api/user#get-apiuserid
        endpoint: `/api/user/${input.id}`,
        retries: 3
    };

    const response = await nango.get<MetabaseUser>(config);

    const user: User = {
        id: response.data.id,
        firstName: response.data.first_name,
        lastName: response.data.last_name,
        email: response.data.email,
        active: response.data.is_active
    };

    return user;
}
