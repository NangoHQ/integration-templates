import type { NangoAction, ProxyConfiguration, CategoryCreate, Category } from '../../models.js';
import { getSubdomain } from '../helpers/get-subdomain.js';
import type { ZendeskCategory } from '../types.js';

export default async function runAction(nango: NangoAction, input: CategoryCreate): Promise<Category> {
    const subdomain = await getSubdomain(nango);
    const metadata = await nango.getMetadata();
    const locale: string = metadata && metadata['locale'] ? String(metadata['locale']) : 'en-us';

    const config: ProxyConfiguration = {
        baseUrlOverride: `https://${subdomain}.zendesk.com`,
        // https://developer.zendesk.com/api-reference/help_center/help-center-api/categories/#create-category
        endpoint: `/api/v2/help_center/${locale}/categories`,
        retries: 3,
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
