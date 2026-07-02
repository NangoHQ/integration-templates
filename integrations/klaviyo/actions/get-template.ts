import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('The ID of the template. Example: "WmRV7f"')
});

const ProviderTemplateAttributesSchema = z.object({
    name: z.string(),
    editor_type: z.string(),
    html: z.string(),
    text: z.string().nullable().optional(),
    amp: z.string().nullable().optional(),
    created: z.string().nullable().optional(),
    updated: z.string().nullable().optional(),
    definition: z.unknown().nullable().optional()
});

const ProviderTemplateDataSchema = z.object({
    type: z.string(),
    id: z.string(),
    attributes: ProviderTemplateAttributesSchema
});

const ProviderResponseSchema = z.object({
    data: ProviderTemplateDataSchema
});

const OutputSchema = z.object({
    id: z.string(),
    name: z.string(),
    editor_type: z.string(),
    html: z.string(),
    text: z.string().optional(),
    amp: z.string().optional(),
    created: z.string().optional(),
    updated: z.string().optional(),
    definition: z.unknown().optional()
});

const action = createAction({
    description: 'Retrieve a template.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['templates:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developers.klaviyo.com/en/reference/get_template
        const response = await nango.get({
            endpoint: `/api/templates/${encodeURIComponent(input.id)}`,
            headers: {
                revision: '2026-04-15'
            },
            retries: 3
        });

        const parsed = ProviderResponseSchema.safeParse(response.data);
        if (!parsed.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'The API returned an unexpected response shape.',
                details: parsed.error.issues
            });
        }

        const providerData = parsed.data.data;
        const attributes = providerData.attributes;

        return {
            id: providerData.id,
            name: attributes.name,
            editor_type: attributes.editor_type,
            html: attributes.html,
            ...(attributes.text != null && { text: attributes.text }),
            ...(attributes.amp != null && { amp: attributes.amp }),
            ...(attributes.created != null && { created: attributes.created }),
            ...(attributes.updated != null && { updated: attributes.updated }),
            ...(attributes.definition != null && { definition: attributes.definition })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
