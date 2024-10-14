import type { NangoAction, ProxyConfiguration, SectionCreate, Section } from '../../models';
import { getSubdomain } from '../helpers/get-subdomain.js';
import type { ZendeskSection } from '../types';

export default async function runAction(nango: NangoAction, input: SectionCreate): Promise<Section> {
    if (!input.section || !input.category_id) {
        throw new nango.ActionError({
            message: 'Category must be associated with a section'
        });
    }

    const metadata = await nango.getMetadata();
    const locale: string = metadata && metadata['locale'] ? metadata['locale'] : 'en-us';

    const subdomain = await getSubdomain(nango);

    const { category_id, ...rest } = input;

    const config: ProxyConfiguration = {
        baseUrlOverride: `https://${subdomain}.zendesk.com`,
        // https://developer.zendesk.com/api-reference/help_center/help-center-api/sections/#create-section
        endpoint: `/api/v2/help_center/${locale}/categories/${category_id}/sections`,
        retries: 10,
        data: rest
    };

    const response = await nango.post<{ section: ZendeskSection }>(config);

    const { data } = response;

    const section: Section = {
        id: data.section.id.toString(),
        name: data.section.name,
        url: data.section.url,
        category_id: data.section.category_id,
        description: data.section.description
    };

    return section;
}
