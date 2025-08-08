import { createAction } from 'nango';
import { getSubdomain } from '../helpers/get-subdomain.js';
import type { ZendeskSection } from '../types.js';

import type { ProxyConfiguration } from 'nango';
import { Section, SectionCreate } from '../models.js';

const action = createAction({
    description: 'Create a section within a category in the help center',
    version: '1.0.0',

    endpoint: {
        method: 'POST',
        path: '/sections',
        group: 'Sections'
    },

    input: SectionCreate,
    output: Section,
    scopes: ['hc:write'],

    exec: async (nango, input): Promise<Section> => {
        if (!input.section || !input.category_id) {
            throw new nango.ActionError({
                message: 'Category must be associated with a section'
            });
        }

        const metadata = await nango.getMetadata();
        const locale: string = metadata && metadata['locale'] ? String(metadata['locale']) : 'en-us';

        const subdomain = await getSubdomain(nango);

        const { category_id, ...rest } = input;

        const config: ProxyConfiguration = {
            baseUrlOverride: `https://${subdomain}.zendesk.com`,
            // https://developer.zendesk.com/api-reference/help_center/help-center-api/sections/#create-section
            endpoint: `/api/v2/help_center/${locale}/categories/${category_id}/sections`,
            retries: 3,
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
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
