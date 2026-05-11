import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    category_id: z.number().describe('The ID of the category to which this section belongs. Example: 123'),
    name: z.string().describe('The name of the section. Example: "Getting Started"'),
    locale: z.string().describe('The locale in which the section is displayed. Example: "en-us"'),
    description: z.string().optional().describe('The description of the section. Example: "Articles about getting started"'),
    position: z.number().optional().describe('The position of this section in the section list. Used when sorting is set to manual.'),
    parent_section_id: z.number().optional().describe('The ID of the parent section. Only writable for Guide Enterprise customers.'),
    theme_template: z.string().optional().describe('The theme template name used to display this section in Help Center.')
});

const ProviderSectionSchema = z.object({
    id: z.number(),
    category_id: z.number().optional(),
    name: z.string(),
    description: z.string().nullable().optional(),
    locale: z.string(),
    source_locale: z.string().optional(),
    position: z.number().optional(),
    parent_section_id: z.number().nullable().optional(),
    theme_template: z.string().nullable().optional(),
    html_url: z.string().optional(),
    url: z.string().optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional(),
    outdated: z.boolean().optional()
});

const OutputSchema = z.object({
    id: z.number(),
    category_id: z.number().optional(),
    name: z.string(),
    description: z.string().optional(),
    locale: z.string(),
    source_locale: z.string().optional(),
    position: z.number().optional(),
    parent_section_id: z.number().optional(),
    theme_template: z.string().optional(),
    html_url: z.string().optional(),
    url: z.string().optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional(),
    outdated: z.boolean().optional()
});

const action = createAction({
    description: 'Create a Zendesk Help Center section',
    version: '2.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/create-section',
        group: 'Help Center'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const sectionPayload: Record<string, unknown> = {
            name: input.name,
            locale: input.locale
        };

        if (input.description !== undefined) {
            sectionPayload['description'] = input.description;
        }
        if (input.position !== undefined) {
            sectionPayload['position'] = input.position;
        }
        if (input.parent_section_id !== undefined) {
            sectionPayload['parent_section_id'] = input.parent_section_id;
        }
        if (input.theme_template !== undefined) {
            sectionPayload['theme_template'] = input.theme_template;
        }

        const payload = { section: sectionPayload };

        // https://developer.zendesk.com/api-reference/help_center/help-center-api/sections/#create-section-in-category
        const response = await nango.post({
            endpoint: `/api/v2/help_center/categories/${encodeURIComponent(input.category_id)}/sections`,
            data: payload,
            retries: 3
        });

        const sectionResponse = ProviderSectionSchema.parse(response.data?.section);

        return {
            id: sectionResponse.id,
            ...(sectionResponse.category_id !== undefined && { category_id: sectionResponse.category_id }),
            name: sectionResponse.name,
            ...(sectionResponse.description !== null && sectionResponse.description !== undefined && { description: sectionResponse.description }),
            locale: sectionResponse.locale,
            ...(sectionResponse.source_locale !== undefined && { source_locale: sectionResponse.source_locale }),
            ...(sectionResponse.position !== undefined && { position: sectionResponse.position }),
            ...(sectionResponse.parent_section_id !== null &&
                sectionResponse.parent_section_id !== undefined && { parent_section_id: sectionResponse.parent_section_id }),
            ...(sectionResponse.theme_template !== null && sectionResponse.theme_template !== undefined && { theme_template: sectionResponse.theme_template }),
            ...(sectionResponse.html_url !== undefined && { html_url: sectionResponse.html_url }),
            ...(sectionResponse.url !== undefined && { url: sectionResponse.url }),
            ...(sectionResponse.created_at !== undefined && { created_at: sectionResponse.created_at }),
            ...(sectionResponse.updated_at !== undefined && { updated_at: sectionResponse.updated_at }),
            ...(sectionResponse.outdated !== undefined && { outdated: sectionResponse.outdated })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
