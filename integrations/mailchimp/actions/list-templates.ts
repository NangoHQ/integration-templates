import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination offset from the previous response. Omit for the first page.'),
    count: z.number().int().min(1).max(1000).optional().describe('Number of templates to return per page. Max 1000, default 10.'),
    folder_id: z.string().optional().describe('Filter templates by folder ID.'),
    type: z.string().optional().describe('Filter templates by type. Possible values: user, base, or gallery.')
});

const ProviderLinkSchema = z.object({
    rel: z.string().optional(),
    href: z.string().optional(),
    method: z.string().optional(),
    targetSchema: z.string().optional(),
    schema: z.string().optional()
});

const ProviderTemplateSchema = z.object({
    id: z.number().describe('The individual id for the template.'),
    type: z.string().optional().describe('The type of template (user, base, or gallery).'),
    name: z.string().optional().describe('The name of the template.'),
    drag_and_drop: z.boolean().optional().describe('Whether the template uses the drag and drop editor.'),
    responsive: z.boolean().optional().describe('Whether the template contains media queries to make it responsive.'),
    category: z.string().optional().describe('If available, the category the template is listed in.'),
    date_created: z.string().optional().describe('The date and time the template was created in ISO 8601 format.'),
    date_edited: z.string().optional().describe('The date and time the template was edited in ISO 8601 format.'),
    created_by: z.string().optional().describe("The login name for template's creator."),
    edited_by: z.string().optional().describe('The login name who last edited the template.'),
    active: z.boolean().optional().describe('User templates are not deleted, but marked as inactive. Returns whether the template is still active.'),
    folder_id: z.string().optional().describe('The id of the folder the template is currently in.'),
    thumbnail: z.string().optional().describe('If available, the URL for a thumbnail of the template.'),
    share_url: z.string().optional().describe('The URL used for template sharing.'),
    content_type: z.string().optional().describe('How the template content is put together. Possible values: template, multichannel, html.'),
    _links: z.array(ProviderLinkSchema).optional()
});

const ProviderListResponseSchema = z.object({
    templates: z.array(ProviderTemplateSchema).optional(),
    total_items: z.number().optional()
});

const TemplateSchema = z.object({
    id: z.number().describe('The individual id for the template.'),
    type: z.string().optional().describe('The type of template (user, base, or gallery).'),
    name: z.string().optional().describe('The name of the template.'),
    drag_and_drop: z.boolean().optional().describe('Whether the template uses the drag and drop editor.'),
    responsive: z.boolean().optional().describe('Whether the template contains media queries to make it responsive.'),
    category: z.string().optional().describe('If available, the category the template is listed in.'),
    date_created: z.string().optional().describe('The date and time the template was created in ISO 8601 format.'),
    date_edited: z.string().optional().describe('The date and time the template was edited in ISO 8601 format.'),
    created_by: z.string().optional().describe("The login name for template's creator."),
    edited_by: z.string().optional().describe('The login name who last edited the template.'),
    active: z.boolean().optional().describe('User templates are not deleted, but marked as inactive. Returns whether the template is still active.'),
    folder_id: z.string().optional().describe('The id of the folder the template is currently in.'),
    thumbnail: z.string().optional().describe('If available, the URL for a thumbnail of the template.'),
    share_url: z.string().optional().describe('The URL used for template sharing.'),
    content_type: z.string().optional().describe('How the template content is put together. Possible values: template, multichannel, html.')
});

const OutputSchema = z.object({
    items: z.array(TemplateSchema).describe('The list of templates.'),
    next_cursor: z.string().optional().describe('Offset to request the next page. Omit if there are no more pages.')
});

const action = createAction({
    description: 'List templates from Mailchimp.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/list-templates',
        group: 'Templates'
    },
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const offset = input.cursor ? (/^\d+$/.test(input.cursor) ? parseInt(input.cursor, 10) : NaN) : 0;
        if (Number.isNaN(offset)) {
            throw new nango.ActionError({
                type: 'invalid_cursor',
                message: 'cursor must be a valid integer string representing an offset'
            });
        }
        const count = input.count ?? 10;

        const params: { count: number; offset: number; folder_id?: string; type?: string } = {
            count,
            offset
        };

        if (input.folder_id !== undefined) {
            params.folder_id = input.folder_id;
        }

        if (input.type !== undefined) {
            params.type = input.type;
        }

        // https://mailchimp.com/developer/marketing/api/templates/list-templates/
        const response = await nango.get({
            endpoint: '/3.0/templates',
            params,
            retries: 3
        });

        const parsed = ProviderListResponseSchema.parse(response.data);
        const templates = parsed.templates ?? [];
        const totalItems = parsed.total_items ?? 0;
        const nextOffset = offset + templates.length;
        const hasMore = templates.length > 0 && nextOffset < totalItems;

        return {
            items: templates.map((template) => ({
                id: template.id,
                ...(template.type !== undefined && { type: template.type }),
                ...(template.name !== undefined && { name: template.name }),
                ...(template.drag_and_drop !== undefined && { drag_and_drop: template.drag_and_drop }),
                ...(template.responsive !== undefined && { responsive: template.responsive }),
                ...(template.category !== undefined && { category: template.category }),
                ...(template.date_created !== undefined && { date_created: template.date_created }),
                ...(template.date_edited !== undefined && { date_edited: template.date_edited }),
                ...(template.created_by !== undefined && { created_by: template.created_by }),
                ...(template.edited_by !== undefined && { edited_by: template.edited_by }),
                ...(template.active !== undefined && { active: template.active }),
                ...(template.folder_id !== undefined && { folder_id: template.folder_id }),
                ...(template.thumbnail !== undefined && { thumbnail: template.thumbnail }),
                ...(template.share_url !== undefined && { share_url: template.share_url }),
                ...(template.content_type !== undefined && { content_type: template.content_type })
            })),
            ...(hasMore && { next_cursor: String(nextOffset) })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
