import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    template_id: z.string().describe('Template ID. Example: "d-e6adcea686a0410aa1f6d05879bf935d"'),
    version_id: z.string().describe('Template version ID. Example: "a7212169-c965-4808-b0ee-f9728250515d"')
});

const ProviderVersionSchema = z.object({
    id: z.string(),
    template_id: z.string(),
    active: z.number().int(),
    name: z.string().optional(),
    subject: z.string().optional(),
    updated_at: z.string().optional(),
    thumbnail_url: z.string().optional(),
    generate_plain_content: z.boolean().optional(),
    editor: z.string().optional(),
    test_data: z.string().optional()
});

const OutputSchema = z.object({
    id: z.string(),
    template_id: z.string(),
    active: z.number().int(),
    name: z.string().optional(),
    subject: z.string().optional(),
    updated_at: z.string().optional()
});

const action = createAction({
    description: 'Mark a template version as the active one used when sending.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['templates.read', 'templates.update'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://www.twilio.com/docs/sendgrid/api-reference/templates/activate-a-template-version
            endpoint: `/v3/templates/${encodeURIComponent(input.template_id)}/versions/${encodeURIComponent(input.version_id)}/activate`,
            retries: 3
        });

        const providerVersion = ProviderVersionSchema.parse(response.data);

        return {
            id: providerVersion.id,
            template_id: providerVersion.template_id,
            active: providerVersion.active,
            ...(providerVersion.name !== undefined && { name: providerVersion.name }),
            ...(providerVersion.subject !== undefined && { subject: providerVersion.subject }),
            ...(providerVersion.updated_at !== undefined && { updated_at: providerVersion.updated_at })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
