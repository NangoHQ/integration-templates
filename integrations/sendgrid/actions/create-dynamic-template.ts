import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    name: z.string().max(100).describe('The name for the new dynamic transactional template. Example: "Welcome Email"')
});

const ProviderTemplateSchema = z.object({
    id: z.string(),
    name: z.string(),
    generation: z.enum(['legacy', 'dynamic']),
    updated_at: z.string(),
    versions: z
        .array(
            z.object({
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
            })
        )
        .optional(),
    warning: z
        .object({
            message: z.string()
        })
        .optional()
});

const OutputSchema = z.object({
    id: z.string().describe('The ID of the transactional template. Example: "733ba07f-ead1-41fc-933a-3976baa23716"'),
    name: z.string().describe('The name for the transactional template.'),
    generation: z.enum(['legacy', 'dynamic']).describe('Defines the generation of the template.'),
    updated_at: z.string().describe('The date and time that this transactional template was updated.'),
    versions: z
        .array(
            z.object({
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
            })
        )
        .optional()
        .describe('The different versions of this transactional template.'),
    warning: z
        .object({
            message: z.string()
        })
        .optional()
        .describe('Warning message for the user.')
});

const action = createAction({
    description: 'Create a dynamic template.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['templates.create'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://www.twilio.com/docs/sendgrid/api-reference/transactional-templates/create-a-transactional-template
            endpoint: '/v3/templates',
            data: {
                name: input.name,
                generation: 'dynamic'
            },
            retries: 3
        });

        const providerTemplate = ProviderTemplateSchema.parse(response.data);

        return {
            id: providerTemplate.id,
            name: providerTemplate.name,
            generation: providerTemplate.generation,
            updated_at: providerTemplate.updated_at,
            ...(providerTemplate.versions !== undefined && { versions: providerTemplate.versions }),
            ...(providerTemplate.warning !== undefined && { warning: providerTemplate.warning })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
