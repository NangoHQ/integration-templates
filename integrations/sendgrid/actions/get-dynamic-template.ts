import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    template_id: z.string().describe('The ID of the dynamic template. Example: d-e6adcea686a0410aa1f6d05879bf935d')
});

const TemplateVersionSchema = z.object({
    id: z.string(),
    template_id: z.string(),
    active: z.number(),
    name: z.string().optional(),
    subject: z.string().optional(),
    updated_at: z.string(),
    generate_plain_content: z.boolean().optional(),
    html_content: z.string().optional(),
    plain_content: z.string().optional(),
    editor: z.enum(['code', 'design']).optional(),
    thumbnail_url: z.string().optional(),
    test_data: z.string().optional()
});

const OutputSchema = z.object({
    id: z.string(),
    name: z.string(),
    generation: z.enum(['legacy', 'dynamic']),
    updated_at: z.string(),
    warning: z
        .object({
            message: z.string()
        })
        .optional(),
    versions: z.array(TemplateVersionSchema)
});

const action = createAction({
    description: 'Get a single dynamic template and all of its versions.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://docs.sendgrid.com/api-reference/transactional-templates/retrieve-a-single-transactional-template
            endpoint: `/v3/templates/${encodeURIComponent(input.template_id)}`,
            retries: 3
        });

        const providerTemplate = OutputSchema.parse(response.data);

        return providerTemplate;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
