import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    template_id: z.string().describe('Template ID. Example: "123"'),
    name: z.string().optional().describe('The name of the template.'),
    html: z.string().optional().describe('The raw HTML for the template.'),
    folder_id: z.string().optional().describe('The folder ID to organize the template in.')
});

const ProviderTemplateSchema = z.object({
    id: z.union([z.string(), z.number()]),
    type: z.string().optional(),
    name: z.string().optional(),
    drag_and_drop: z.boolean().optional(),
    responsive: z.boolean().optional(),
    category: z.string().optional(),
    date_created: z.string().optional(),
    date_edited: z.string().optional(),
    created_by: z.string().optional(),
    edited_by: z.string().optional(),
    active: z.boolean().optional(),
    folder_id: z.string().optional(),
    thumbnail: z.string().optional(),
    share_url: z.string().optional(),
    content_type: z.string().optional()
});

const OutputSchema = z.object({
    id: z.string(),
    type: z.string().optional(),
    name: z.string().optional(),
    drag_and_drop: z.boolean().optional(),
    responsive: z.boolean().optional(),
    category: z.string().optional(),
    date_created: z.string().optional(),
    date_edited: z.string().optional(),
    created_by: z.string().optional(),
    edited_by: z.string().optional(),
    active: z.boolean().optional(),
    folder_id: z.string().optional(),
    thumbnail: z.string().optional(),
    share_url: z.string().optional(),
    content_type: z.string().optional()
});

const action = createAction({
    description: 'Update a template in Mailchimp.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['templates'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const data: Record<string, unknown> = {};
        if (input.name !== undefined) {
            data['name'] = input.name;
        }
        if (input.html !== undefined) {
            data['html'] = input.html;
        }
        if (input.folder_id !== undefined) {
            data['folder_id'] = input.folder_id;
        }

        const response = await nango.patch({
            // https://mailchimp.com/developer/marketing/api/templates/update-template/
            endpoint: `/3.0/templates/${encodeURIComponent(input.template_id)}`,
            data,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Template not found or update failed',
                template_id: input.template_id
            });
        }

        const providerTemplate = ProviderTemplateSchema.parse(response.data);

        return {
            id: String(providerTemplate.id),
            ...(providerTemplate.type !== undefined && { type: providerTemplate.type }),
            ...(providerTemplate.name !== undefined && { name: providerTemplate.name }),
            ...(providerTemplate.drag_and_drop !== undefined && { drag_and_drop: providerTemplate.drag_and_drop }),
            ...(providerTemplate.responsive !== undefined && { responsive: providerTemplate.responsive }),
            ...(providerTemplate.category !== undefined && { category: providerTemplate.category }),
            ...(providerTemplate.date_created !== undefined && { date_created: providerTemplate.date_created }),
            ...(providerTemplate.date_edited !== undefined && { date_edited: providerTemplate.date_edited }),
            ...(providerTemplate.created_by !== undefined && { created_by: providerTemplate.created_by }),
            ...(providerTemplate.edited_by !== undefined && { edited_by: providerTemplate.edited_by }),
            ...(providerTemplate.active !== undefined && { active: providerTemplate.active }),
            ...(providerTemplate.folder_id !== undefined && { folder_id: providerTemplate.folder_id }),
            ...(providerTemplate.thumbnail !== undefined && { thumbnail: providerTemplate.thumbnail }),
            ...(providerTemplate.share_url !== undefined && { share_url: providerTemplate.share_url }),
            ...(providerTemplate.content_type !== undefined && { content_type: providerTemplate.content_type })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
