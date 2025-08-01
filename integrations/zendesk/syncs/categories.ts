import type { NangoSync, ProxyConfiguration, Category } from '../../models';
import type { ZendeskCategory } from '../types';
import { getSubdomain } from '../helpers/get-subdomain.js';

export default async function fetchData(nango: NangoSync) {
    const subdomain = await getSubdomain(nango);
    const metadata = await nango.getMetadata();
    const locale: string = metadata && metadata['locale'] ? String(metadata['locale']) : 'en-us';

    const config: ProxyConfiguration = {
        baseUrlOverride: `https://${subdomain}.zendesk.com`,
        // https://developer.zendesk.com/api-reference/help_center/help-center-api/categories/#list-categories
        endpoint: `/api/v2/help_center/${locale}/categories`,
        retries: 10,
        paginate: {
            type: 'cursor',
            cursor_path_in_response: 'meta.after_cursor',
            limit_name_in_request: 'page[size]',
            cursor_name_in_request: 'page[after]',
            limit: 100,
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
