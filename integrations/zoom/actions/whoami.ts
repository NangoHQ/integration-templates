import type { NangoAction, ProxyConfiguration, UserInformation } from '../../models.js';
import type { ZoomUser } from '../types.js';

export default async function runAction(nango: NangoAction): Promise<UserInformation> {
    const config: ProxyConfiguration = {
        // https://developers.zoom.us/docs/api/users/#tag/users/GET/users/{userId}
        endpoint: '/users/me',
        retries: 3
    };

    const { data } = await nango.get<ZoomUser>(config);

    const user: UserInformation = {
        id: data.id,
        email: data.email
    };

    return user;
}
