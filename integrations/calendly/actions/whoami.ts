import type { NangoAction, ProxyConfiguration, UserInformation } from '../../models';
import type { CalendlyCurrentUser } from '../types';

export default async function runAction(nango: NangoAction): Promise<UserInformation> {
    const config: ProxyConfiguration = {
        // https://developer.calendly.com/api-docs/005832c83aeae-get-current-user
        endpoint: '/users/me',
        retries: 3
    };

    const { data } = await nango.get<{ resource: CalendlyCurrentUser }>(config);

    const id: string | undefined = data.resource.uri.split('/').pop();

    if (!id) {
        throw new nango.ActionError({
            message: 'Unable to find user id',
            data
        });
    }

    const user: UserInformation = {
        id,
        email: data.resource.email
    };

    return user;
}
