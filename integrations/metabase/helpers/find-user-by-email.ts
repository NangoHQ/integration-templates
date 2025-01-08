import type { NangoAction, ProxyConfiguration } from '../../models';

export async function findUserByEmail(email: string, nango: NangoAction): Promise<any> {
    const fetchUserConfig: ProxyConfiguration = {
        // Metabase API endpoint to fetch users
        endpoint: '/api/user',
        params: { query: email, status: 'all' },
        retries: 5,
        method: 'GET'
    };
    const response = await nango.get(fetchUserConfig);

    if (!response.data || response.data.length === 0) {
        throw new Error(`No user found with email: ${email}`);
    }

    // Validate the response and return the first matched user
    const user = response.data.data[0];
    return user;
}
