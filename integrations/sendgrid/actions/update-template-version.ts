import { z } from 'zod';
import { createAction, type ProxyConfiguration } from 'nango';

const InputSchema = z.object({
    template_id: z.string().describe('The ID of the template. Example: d-e6adcea686a0410aa1f6d05879bf935d'),
    version_id: z.string().describe('The ID of the version to update. Example: a7212169-c965-4808-b0ee-f9728250515d'),
    active: z.number().int().min(0).max(1).optional().describe('Set to 1 to activate, 0 to deactivate'),
    name: z.string().max(100).optional(),
    subject: z.string().max(255).optional(),
    html_content: z.string().optional(),
    plain_content: z.string().optional(),
    editor: z.string().optional(),
    thumbnail_url: z.string().optional(),
    test_data: z.string().optional().describe('Mock JSON data used for dynamic template preview and test sends.'),
    generate_plain_content: z
        .boolean()
        .optional()
        .describe(
            'Defaults to false for any update that does not also set html_content, to avoid silently regenerating (and overwriting) the version existing plain_content. SendGrid defaults this to true when omitted, which is only desirable when html_content is being updated and regeneration is intended.'
        )
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
    generate_plain_content: z.boolean().optional().nullable(),
    test_data: z.string().optional().nullable()
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
    generate_plain_content: z.boolean().optional(),
    test_data: z.string().optional()
});

const action = createAction({
    description: "Update a template version's content.",
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // SendGrid defaults generate_plain_content to true, which would silently regenerate (and
        // overwrite) the version's existing plain_content on any update that doesn't also set
        // html_content — e.g. a metadata-only update to just `subject` or `test_data`. Default to
        // false in that case; only leave it omitted (SendGrid's default) when html_content is being
        // updated and plain_content regeneration is presumably intended.
        const generatePlainContent =
            input.generate_plain_content !== undefined ? input.generate_plain_content : input.html_content === undefined ? false : undefined;

        const config: ProxyConfiguration = {
            // https://www.twilio.com/docs/sendgrid/api-reference/templates-versions/update-template-version
            endpoint: `/v3/templates/${encodeURIComponent(input.template_id)}/versions/${encodeURIComponent(input.version_id)}`,
            data: {
                ...(input.active !== undefined && { active: input.active }),
                ...(input.name !== undefined && { name: input.name }),
                ...(input.subject !== undefined && { subject: input.subject }),
                ...(input.html_content !== undefined && { html_content: input.html_content }),
                ...(input.plain_content !== undefined && { plain_content: input.plain_content }),
                ...(input.editor !== undefined && { editor: input.editor }),
                ...(input.thumbnail_url !== undefined && { thumbnail_url: input.thumbnail_url }),
                ...(input.test_data !== undefined && { test_data: input.test_data }),
                ...(generatePlainContent !== undefined && { generate_plain_content: generatePlainContent })
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
            ...(providerVersion.generate_plain_content != null && { generate_plain_content: providerVersion.generate_plain_content }),
            ...(providerVersion.test_data != null && { test_data: providerVersion.test_data })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
