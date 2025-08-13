import type { NangoAction, ProxyConfiguration } from 'nango';
import type { LinkedInUserInfo } from '../types.js';

export async function userInfo(nango: NangoAction): Promise<LinkedInUserInfo> {
    const config: ProxyConfiguration = {
        // https://learn.microsoft.com/en-us/linkedin/shared/integrations/people/profile-api
        endpoint: '/v2/userinfo',
        retries: 10,
        headers: {
            'LinkedIn-Version': '202405'
        }
    };

    const response = await nango.get(config);

    const { data } = response;

    return data;
}
