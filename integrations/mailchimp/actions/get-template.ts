import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    template_id: z.number().describe('The ID of the template to retrieve. Example: 12345')
});

const LinkSchema = z.object({
    rel: z.string().optional(),
    href: z.string().optional(),
    method: z.string().optional(),
    targetSchema: z.string().optional(),
    schema: z.string().optional()
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
    folder_id: z.string().optional(),
    thumbnail: z.string().optional(),
    share_url: z.string().optional(),
    content_type: z.string().optional(),
    _links: z.array(LinkSchema).optional()
});

const OutputSchema = ProviderTemplateSchema;

const action = createAction({
    description: 'Retrieve a single template from Mailchimp.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/get-template'
    },
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://mailchimp.com/developer/marketing/api/templates/get-template-info/
            endpoint: `/3.0/templates/${encodeURIComponent(String(input.template_id))}`,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Template not found',
                template_id: input.template_id
            });
        }

        const template = ProviderTemplateSchema.parse(response.data);
        return template;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
