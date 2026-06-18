import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    dataSourceId: z.string().describe('The ID of the Notion data source. Example: "d9824bdc-8445-4327-be8b-5b47500af6ce"'),
    name: z.string().optional().describe('Filter templates by name (case-insensitive substring match).'),
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.'),
    limit: z.number().min(1).max(100).optional().describe('Number of items to return per page (1-100). Defaults to 100.')
});

const TemplateSchema = z.object({
    id: z.string().describe('ID of the template page.'),
    name: z.string().describe('Name of the template.'),
    isDefault: z.boolean().describe('Whether this template is the default template for the data source.')
});

const OutputSchema = z.object({
    templates: z.array(TemplateSchema).describe('Array of templates available in this data source.'),
    hasMore: z.boolean().describe('Whether there are more templates available beyond this page.'),
    nextCursor: z.string().optional().describe('Cursor to use for the next page of results. Omitted if there are no more results.')
});

const action = createAction({
    description: 'List templates available for a data source.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://developers.notion.com/reference/list-data-source-templates
            endpoint: `/v1/data_sources/${encodeURIComponent(input.dataSourceId)}/templates`,
            headers: {
                'Notion-Version': '2025-09-03'
            },
            params: {
                ...(input.name !== undefined && { name: input.name }),
                ...(input.cursor !== undefined && { start_cursor: input.cursor }),
                ...(input.limit !== undefined && { page_size: input.limit.toString() })
            },
            retries: 3
        });

        const providerData = z
            .object({
                templates: z.array(
                    z.object({
                        id: z.string(),
                        name: z.string(),
                        is_default: z.boolean()
                    })
                ),
                has_more: z.boolean(),
                next_cursor: z.string().nullable().optional()
            })
            .parse(response.data);

        return {
            templates: providerData.templates.map((template) => ({
                id: template.id,
                name: template.name,
                isDefault: template.is_default
            })),
            hasMore: providerData.has_more,
            ...(providerData.next_cursor !== null && { nextCursor: providerData.next_cursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
