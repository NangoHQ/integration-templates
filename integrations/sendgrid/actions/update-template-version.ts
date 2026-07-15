import { z } from 'zod';
import { createAction, type ProxyConfiguration } from 'nango';

const InputSchema = z.object({
    template_id: z.string().describe('The ID of the template. Example: d-e6adcea686a0410aa1f6d05879bf935d'),
    version_id: z.string().describe('The ID of the version to update. Example: a7212169-c965-4808-b0ee-f9728250515d'),
    active: z.number().int().min(0).max(1).optional().describe('Set to 1 to activate, 0 to deactivate'),
    name: z.string().optional(),
    html_content: z.string().optional(),
    plain_content: z.string().optional(),
    subject: z.string().optional(),
    editor: z.string().optional(),
    thumbnail_url: z.string().optional(),
    generate_plain_content: z.boolean().optional()
});

const ProviderVersionSchema = z.object({
    id: z.string(),
    template_id: z.string(),
    active: z.number().optional().nullable(),
    name: z.string().optional().nullable(),
    html_content: z.string().optional().nullable(),
    plain_content: z.string().optional().nullable(),
    subject: z.string().optional().nullable(),
    editor: z.string().optional().nullable(),
    thumbnail_url: z.string().optional().nullable(),
    updated_at: z.string().optional().nullable(),
    generate_plain_content: z.boolean().optional().nullable()
});

const OutputSchema = z.object({
    id: z.string(),
    template_id: z.string(),
    active: z.number().optional(),
    name: z.string().optional(),
    html_content: z.string().optional(),
    plain_content: z.string().optional(),
    subject: z.string().optional(),
    editor: z.string().optional(),
    thumbnail_url: z.string().optional(),
    updated_at: z.string().optional(),
    generate_plain_content: z.boolean().optional()
});

const action = createAction({
    description: "Update a template version's content.",
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://www.twilio.com/docs/sendgrid/api-reference/templates-versions/update-template-version
            endpoint: `/v3/templates/${encodeURIComponent(input.template_id)}/versions/${encodeURIComponent(input.version_id)}`,
            data: {
                ...(input.active !== undefined && { active: input.active }),
                ...(input.name !== undefined && { name: input.name }),
                ...(input.html_content !== undefined && { html_content: input.html_content }),
                ...(input.plain_content !== undefined && { plain_content: input.plain_content }),
                ...(input.subject !== undefined && { subject: input.subject }),
                ...(input.editor !== undefined && { editor: input.editor }),
                ...(input.thumbnail_url !== undefined && { thumbnail_url: input.thumbnail_url }),
                ...(input.generate_plain_content !== undefined && { generate_plain_content: input.generate_plain_content })
            },
            retries: 1
        };

        const response = await nango.patch(config);

        const providerVersion = ProviderVersionSchema.parse(response.data);

        return {
            id: providerVersion.id,
            template_id: providerVersion.template_id,
            ...(providerVersion.active != null && { active: providerVersion.active }),
            ...(providerVersion.name != null && { name: providerVersion.name }),
            ...(providerVersion.html_content != null && { html_content: providerVersion.html_content }),
            ...(providerVersion.plain_content != null && { plain_content: providerVersion.plain_content }),
            ...(providerVersion.subject != null && { subject: providerVersion.subject }),
            ...(providerVersion.editor != null && { editor: providerVersion.editor }),
            ...(providerVersion.thumbnail_url != null && { thumbnail_url: providerVersion.thumbnail_url }),
            ...(providerVersion.updated_at != null && { updated_at: providerVersion.updated_at }),
            ...(providerVersion.generate_plain_content != null && { generate_plain_content: providerVersion.generate_plain_content })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
