import { createSync } from 'nango';
import { z } from 'zod';

const SectionSchema = z.object({
    id: z.number(),
    name: z.string(),
    description: z.string().nullable().optional(),
    category_id: z.number().nullable().optional(),
    parent_section_id: z.number().nullable().optional(),
    locale: z.string(),
    source_locale: z.string().nullable().optional(),
    created_at: z.string(),
    updated_at: z.string(),
    position: z.number().nullable().optional(),
    outdated: z.boolean().nullable().optional(),
    html_url: z.string().nullable().optional(),
    url: z.string().nullable().optional(),
    theme_template: z.string().nullable().optional()
});

const SectionModelSchema = z.object({
    id: z.string(),
    name: z.string(),
    description: z.string().optional(),
    category_id: z.number().optional(),
    parent_section_id: z.number().optional(),
    locale: z.string(),
    source_locale: z.string().optional(),
    created_at: z.string(),
    updated_at: z.string(),
    position: z.number().optional(),
    outdated: z.boolean().optional(),
    html_url: z.string().optional(),
    url: z.string().optional(),
    theme_template: z.string().optional()
});

const sync = createSync({
    description: 'Sync Zendesk Help Center sections',
    version: '3.0.0',
    frequency: 'every hour',
    autoStart: true,
    endpoints: [
        {
            path: '/syncs/sections',
            method: 'GET'
        }
    ],
    models: {
        Section: SectionModelSchema
    },

    exec: async (nango) => {
        // https://developer.zendesk.com/api-reference/help_center/help-center-api/sections/
        const proxyConfig: {
            endpoint: string;
            params: { sort_by: string; sort_order: string };
            paginate: {
                type: 'cursor';
                cursor_path_in_response: string;
                cursor_name_in_request: string;
                response_path: string;
                limit: number;
            };
            retries: number;
        } = {
            endpoint: '/api/v2/help_center/sections.json',
            params: {
                sort_by: 'updated_at',
                sort_order: 'asc'
            },
            paginate: {
                type: 'cursor',
                cursor_path_in_response: 'next_page',
                cursor_name_in_request: 'page',
                response_path: 'sections',
                limit: 100
            },
            retries: 3
        };

        await nango.trackDeletesStart('Section');

        try {
            for await (const page of nango.paginate(proxyConfig)) {
                const sections: z.infer<typeof SectionSchema>[] = [];
                for (const raw of page) {
                    const parsed = SectionSchema.safeParse(raw);
                    if (!parsed.success) {
                        throw new Error(`Failed to parse section: ${parsed.error.message}`);
                    }
                    sections.push(parsed.data);
                }

                if (sections.length === 0) {
                    continue;
                }

                const mappedSections = sections.map((section) => ({
                    id: String(section.id),
                    name: section.name,
                    ...(section.description !== undefined && section.description !== null && { description: section.description }),
                    ...(section.category_id !== undefined && section.category_id !== null && { category_id: section.category_id }),
                    ...(section.parent_section_id !== undefined && section.parent_section_id !== null && { parent_section_id: section.parent_section_id }),
                    locale: section.locale,
                    ...(section.source_locale !== undefined && section.source_locale !== null && { source_locale: section.source_locale }),
                    created_at: section.created_at,
                    updated_at: section.updated_at,
                    ...(section.position !== undefined && section.position !== null && { position: section.position }),
                    ...(section.outdated !== undefined && section.outdated !== null && { outdated: section.outdated }),
                    ...(section.html_url !== undefined && section.html_url !== null && { html_url: section.html_url }),
                    ...(section.url !== undefined && section.url !== null && { url: section.url }),
                    ...(section.theme_template !== undefined && section.theme_template !== null && { theme_template: section.theme_template })
                }));

                await nango.batchSave(mappedSections, 'Section');
            }
        } finally {
            await nango.trackDeletesEnd('Section');
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
