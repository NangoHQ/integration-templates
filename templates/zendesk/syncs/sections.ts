import { createSync } from "nango";
import type { ZendeskSection } from '../types.js';
import { getSubdomain } from '../helpers/get-subdomain.js';

import type { ProxyConfiguration } from "nango";
import { Section } from "../models.js";
import { z } from "zod";

const sync = createSync({
    description: "Fetches a list of sections in Help center from Zendesk",
    version: "2.0.0",
    frequency: "every 6 hours",
    autoStart: true,
    syncType: "full",
    trackDeletes: true,

    endpoints: [{
        method: "GET",
        path: "/sections",
        group: "Sections"
    }],

    scopes: ["hc:read"],

    models: {
        Section: Section
    },

    metadata: z.object({}),

    exec: async nango => {
        const subdomain = await getSubdomain(nango);
        const metadata = await nango.getMetadata();
        const locale: string = metadata && metadata['locale'] ? String(metadata['locale']) : 'en-us';

        const config: ProxyConfiguration = {
            baseUrlOverride: `https://${subdomain}.zendesk.com`,
            // https://developer.zendesk.com/api-reference/help_center/help-center-api/sections/#list-sections
            endpoint: `/api/v2/help_center/${locale}/sections`,
            paginate: {
                type: 'cursor',
                cursor_path_in_response: 'meta.after_cursor',
                limit_name_in_request: 'page[size]',
                cursor_name_in_request: 'page[after]',
                limit: 100,
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
});

export type NangoSyncLocal = Parameters<typeof sync["exec"]>[0];
export default sync;
