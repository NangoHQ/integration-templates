import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    name: z.string().describe('The name of the category. Example: "Getting Started"'),
    locale: z.string().describe('The locale where the category is displayed. Example: "en-us"'),
    description: z.string().optional().describe('The description of the category'),
    position: z.number().int().optional().describe('The position of this category relative to other categories')
});

const ProviderCategorySchema = z.object({
    id: z.number(),
    name: z.string(),
    locale: z.string(),
    description: z.string().nullable().optional(),
    position: z.number().int().optional(),
    created_at: z.string(),
    updated_at: z.string(),
    html_url: z.string(),
    url: z.string(),
    outdated: z.boolean().optional(),
    source_locale: z.string().optional()
});

const OutputSchema = z.object({
    id: z.number(),
    name: z.string(),
    locale: z.string(),
    description: z.string().optional(),
    position: z.number().int().optional(),
    created_at: z.string(),
    updated_at: z.string(),
    html_url: z.string(),
    url: z.string(),
    outdated: z.boolean().optional(),
    source_locale: z.string().optional()
});

const action = createAction({
    description: 'Create a Zendesk Help Center category',
    version: '2.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['hc:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const categoryData: Record<string, unknown> = {
            category: {
                name: input.name,
                locale: input.locale,
                ...(input.description !== undefined && { description: input.description }),
                ...(input.position !== undefined && { position: input.position })
            }
        };

        // https://developer.zendesk.com/api-reference/help_center/help-center-api/categories/#create-category
        const response = await nango.post({
            endpoint: '/api/v2/help_center/categories',
            data: categoryData,
            retries: 3
        });

        const providerCategory = ProviderCategorySchema.parse(response.data.category);

        return {
            id: providerCategory.id,
            name: providerCategory.name,
            locale: providerCategory.locale,
            ...(providerCategory.description != null && { description: providerCategory.description }),
            ...(providerCategory.position !== undefined && { position: providerCategory.position }),
            created_at: providerCategory.created_at,
            updated_at: providerCategory.updated_at,
            html_url: providerCategory.html_url,
            url: providerCategory.url,
            ...(providerCategory.outdated !== undefined && { outdated: providerCategory.outdated }),
            ...(providerCategory.source_locale !== undefined && { source_locale: providerCategory.source_locale })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
