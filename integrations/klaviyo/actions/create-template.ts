import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    name: z.string().min(1).describe('Template name. Example: "Welcome Email"'),
    html: z.string().min(1).describe('Raw HTML content for the template. Example: "<html><body>Hello</body></html>"')
});

const ProviderTemplateSchema = z.object({
    data: z.object({
        type: z.string(),
        id: z.string(),
        attributes: z.object({
            name: z.string(),
            editor_type: z.string(),
            html: z.string(),
            created: z.string().optional(),
            updated: z.string().optional()
        }),
        relationships: z.object({}).passthrough().optional()
    })
});

const OutputSchema = z.object({
    id: z.string().describe('Template ID. Example: "WmRV7f"'),
    name: z.string().describe('Template name.'),
    editor_type: z.string().describe('Editor type used to create the template. Example: "CODE"'),
    html: z.string().describe('Raw HTML content of the template.'),
    created_at: z.string().optional().describe('ISO 8601 creation timestamp.'),
    updated_at: z.string().optional().describe('ISO 8601 update timestamp.')
});

const action = createAction({
    description: 'Create an HTML email template.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['templates:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developers.klaviyo.com/en/reference/create_template
        const response = await nango.post({
            endpoint: '/api/templates',
            headers: {
                revision: '2026-04-15'
            },
            data: {
                data: {
                    type: 'template',
                    attributes: {
                        name: input.name,
                        editor_type: 'CODE',
                        html: input.html
                    }
                }
            },
            retries: 3
        });

        const parsed = ProviderTemplateSchema.safeParse(response.data);
        if (!parsed.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'The provider returned an unexpected response shape.',
                details: parsed.error.issues
            });
        }

        const template = parsed.data.data;
        const attributes = template.attributes;

        return {
            id: template.id,
            name: attributes.name,
            editor_type: attributes.editor_type,
            html: attributes.html,
            ...(attributes.created !== undefined && { created_at: attributes.created }),
            ...(attributes.updated !== undefined && { updated_at: attributes.updated })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
