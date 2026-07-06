import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('The ID of the template. Example: "VJQSuC"'),
    name: z.string().nullable().optional().describe('The name of the template'),
    html: z.string().nullable().optional().describe('The HTML contents of the template'),
    text: z.string().nullable().optional().describe('The plaintext of the template'),
    amp: z.string().nullable().optional().describe('The AMP version of the template')
});

const ProviderResponseSchema = z.object({
    data: z.object({
        type: z.string(),
        id: z.string(),
        attributes: z.object({
            name: z.string(),
            editor_type: z.string(),
            html: z.string(),
            text: z.string().nullable().optional(),
            amp: z.string().nullable().optional(),
            created: z.string().nullable().optional(),
            updated: z.string().nullable().optional()
        }),
        links: z
            .object({
                self: z.string().optional()
            })
            .optional()
    })
});

const OutputSchema = z.object({
    id: z.string(),
    name: z.string(),
    editor_type: z.string(),
    html: z.string(),
    text: z.string().optional(),
    amp: z.string().optional(),
    created: z.string().optional(),
    updated: z.string().optional()
});

const action = createAction({
    description: 'Update a template.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['templates:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const attributes: Record<string, unknown> = {};
        if (input.name !== undefined) {
            attributes['name'] = input.name;
        }
        if (input.html !== undefined) {
            attributes['html'] = input.html;
        }
        if (input.text !== undefined) {
            attributes['text'] = input.text;
        }
        if (input.amp !== undefined) {
            attributes['amp'] = input.amp;
        }

        const response = await nango.patch({
            // https://developers.klaviyo.com/en/reference/update_template
            endpoint: `/api/templates/${encodeURIComponent(input.id)}`,
            headers: {
                revision: '2026-04-15'
            },
            data: {
                data: {
                    type: 'template',
                    id: input.id,
                    attributes
                }
            },
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);
        const attrs = providerResponse.data.attributes;

        return {
            id: providerResponse.data.id,
            name: attrs.name,
            editor_type: attrs.editor_type,
            html: attrs.html,
            ...(attrs.text != null && { text: attrs.text }),
            ...(attrs.amp != null && { amp: attrs.amp }),
            ...(attrs.created != null && { created: attrs.created }),
            ...(attrs.updated != null && { updated: attrs.updated })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
