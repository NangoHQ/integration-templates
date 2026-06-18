import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    name: z.string().describe('The name for the template. Example: "Welcome Email Template"'),
    html: z.string().describe('The HTML content for the template. Example: "<html><body>Hello</body></html>"'),
    folder_id: z.number().optional().describe('The ID of the folder to store the template in. Example: 42')
});

const ProviderTemplateSchema = z.object({
    id: z.number(),
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
    folder_id: z.number().optional(),
    thumbnail: z.string().optional(),
    share_url: z.string().optional(),
    _links: z.array(z.unknown()).optional()
});

const OutputSchema = z.object({
    id: z.number(),
    name: z.string().optional(),
    type: z.string().optional(),
    date_created: z.string().optional(),
    date_edited: z.string().optional(),
    active: z.boolean().optional(),
    thumbnail: z.string().optional(),
    share_url: z.string().optional(),
    folder_id: z.number().optional()
});

const action = createAction({
    description: 'Create a template in Mailchimp.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['templates:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://mailchimp.com/developer/marketing/api/templates/add-template/
            endpoint: '/3.0/templates',
            data: {
                name: input.name,
                html: input.html,
                ...(input.folder_id !== undefined && { folder_id: input.folder_id })
            },
            retries: 3
        });

        const providerTemplate = ProviderTemplateSchema.parse(response.data);

        return {
            id: providerTemplate.id,
            ...(providerTemplate.name !== undefined && { name: providerTemplate.name }),
            ...(providerTemplate.type !== undefined && { type: providerTemplate.type }),
            ...(providerTemplate.date_created !== undefined && { date_created: providerTemplate.date_created }),
            ...(providerTemplate.date_edited !== undefined && { date_edited: providerTemplate.date_edited }),
            ...(providerTemplate.active !== undefined && { active: providerTemplate.active }),
            ...(providerTemplate.thumbnail !== undefined && { thumbnail: providerTemplate.thumbnail }),
            ...(providerTemplate.share_url !== undefined && { share_url: providerTemplate.share_url }),
            ...(providerTemplate.folder_id !== undefined && { folder_id: providerTemplate.folder_id })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
