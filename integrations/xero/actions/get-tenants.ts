import type { NangoAction, TenantResponse, ProxyConfiguration } from '../../models.js';

export default async function runAction(nango: NangoAction): Promise<TenantResponse> {
    const config: ProxyConfiguration = {
        // https://developer.xero.com/documentation/guides/oauth2/tenants
        endpoint: 'connections',
        retries: 3
    };
    const { data: tenants } = await nango.get(config);

    return { tenants };
}
