import type { NangoSync, ProxyConfiguration, Category } from '../../models';
import type { ZendeskCategory } from '../types';
import { getSubdomain } from '../helpers/get-subdomain.js';

export default async function fetchData(nango: NangoSync) {
    const subdomain = await getSubdomain(nango);
    const metadata = await nango.getMetadata();
    const locale = metadata?.['locale'] || 'en-us';

    const config: ProxyConfiguration = {
        baseUrlOverride: `https://${subdomain}.zendesk.com`,
        endpoint: `/api/v2/help_center/${locale}/categories`,
        retries: 10,
        paginate: {
            response_path: 'categories'
        }
    };

    for await (const zCategories of nango.paginate<ZendeskCategory>(config)) {
        const categories: Category[] = zCategories.map((zCategory: ZendeskCategory) => {
            return {
                id: zCategory.id.toString(),
                name: zCategory.name,
                url: zCategory.url,
                description: zCategory.description
            };
        });

        await nango.batchSave(categories, 'Category');
    }
}
