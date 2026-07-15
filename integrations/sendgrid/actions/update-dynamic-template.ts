import { createAction } from 'nango';
import { z } from 'zod';

const TemplateWarningSchema = z.object({
    message: z.string()
});

const TemplateVersionSchema = z.object({
    id: z.string(),
    template_id: z.string(),
    active: z.number(),
    name: z.string(),
    subject: z.string().optional(),
    updated_at: z.string(),
    generate_plain_content: z.boolean().optional(),
    html_content: z.string().optional(),
    plain_content: z.string().optional(),
    editor: z.enum(['code', 'design']).optional(),
    thumbnail_url: z.string().optional()
});

const OutputSchema = z
    .object({
        id: z.string(),
        name: z.string(),
        generation: z.enum(['legacy', 'dynamic']),
        updated_at: z.string(),
        warning: TemplateWarningSchema.optional(),
        versions: z.array(TemplateVersionSchema).optional()
    })
    .passthrough();

const InputSchema = z.object({
    templateId: z.string().describe('The ID of the transactional template.'),
    name: z.string().max(100).describe('The new name for the transactional template.')
});

export default createAction({
    description: 'Rename a dynamic template.',
    input: InputSchema,
    output: OutputSchema,
    exec: async (nango, input) => {
        // https://www.twilio.com/docs/sendgrid/api-reference/transactional-templates/edit-a-transactional-template
        const response = await nango.patch({
            endpoint: `/v3/templates/${encodeURIComponent(input.templateId)}`,
            data: {
                name: input.name
            },
            retries: 3
        });

        const parsed = OutputSchema.safeParse(response.data);
        if (!parsed.success) {
            throw new nango.ActionError({
                message: 'Invalid response from SendGrid API',
                details: parsed.error.issues
            });
        }

        return parsed.data;
    }
});
