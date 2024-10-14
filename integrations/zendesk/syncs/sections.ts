import type { NangoSync, ProxyConfiguration, Section } from '../../models';
import type { ZendeskSection } from '../types';
import { getSubdomain } from '../helpers/get-subdomain.js';

export default async function fetchData(nango: NangoSync) {
    const subdomain = await getSubdomain(nango);
    const metadata = await nango.getMetadata();
    const locale = metadata?.['locale'] || 'en-us';

    const config: ProxyConfiguration = {
        baseUrlOverride: `https://${subdomain}.zendesk.com`,
        // https://developer.zendesk.com/api-reference/help_center/help-center-api/sections/#list-sections
        endpoint: `/api/v2/help_center/${locale}/sections`,
        paginate: {
            response_path: 'sections'
        }
    };

    for await (const zSections of nango.paginate<ZendeskSection>(config)) {
        const sections: Section[] = zSections.map((zSection: ZendeskSection) => {
            return {
                id: zSection.id.toString(),
                url: zSection.url,
                category_id: zSection.category_id,
                name: zSection.name,
                description: zSection.description
            };
        });

        await nango.batchSave(sections, 'Section');
    }
}
