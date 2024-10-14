import type { NangoAction, ProxyConfiguration, CategoryCreate, Category } from '../../models';
import { getSubdomain } from '../helpers/get-subdomain.js';
import type { ZendeskCategory } from '../types';

export default async function runAction(nango: NangoAction, input: CategoryCreate): Promise<Category> {
    const subdomain = await getSubdomain(nango);
    const metadata = await nango.getMetadata();
    const locale = metadata?.['locale'] || 'en-us';

    const config: ProxyConfiguration = {
        baseUrlOverride: `https://${subdomain}.zendesk.com`,
        endpoint: `/api/v2/help_center/${locale}/categories`,
        retries: 10,
        data: input
    };

    const response = await nango.post<{ category: ZendeskCategory }>(config);

    const { data } = response;

    const category: Category = {
        id: data.category.id.toString(),
        name: data.category.name,
        url: data.category.url,
        description: data.category.description
    };

    return category;
}
