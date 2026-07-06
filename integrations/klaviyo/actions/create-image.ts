import { z } from 'zod';
import { createAction, ProxyConfiguration } from 'nango';

const InputSchema = z.object({
    import_from_url: z.string().url().describe('URL of the image to import. Example: "https://example.com/image.png"'),
    name: z.string().optional().describe('Name for the imported image. Example: "My Image"')
});

const ProviderImageAttributesSchema = z.object({
    name: z.string().nullable().optional(),
    image_url: z.string().nullable().optional(),
    updated_at: z.string().nullable().optional(),
    format: z.string().nullable().optional(),
    size: z.number().nullable().optional(),
    hidden: z.boolean().nullable().optional()
});

const ProviderImageDataSchema = z.object({
    type: z.string(),
    id: z.string(),
    attributes: ProviderImageAttributesSchema.optional()
});

const ProviderResponseSchema = z.object({
    data: ProviderImageDataSchema
});

const OutputSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    image_url: z.string().optional(),
    updated_at: z.string().optional()
});

const action = createAction({
    description: 'Upload an image from a URL.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['images:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://developers.klaviyo.com/en/reference/create_image
            endpoint: '/api/images',
            headers: {
                revision: '2026-04-15'
            },
            data: {
                data: {
                    type: 'image',
                    attributes: {
                        import_from_url: input.import_from_url,
                        ...(input.name !== undefined && { name: input.name })
                    }
                }
            },
            retries: 3
        };

        const response = await nango.post(config);

        const parsed = ProviderResponseSchema.parse(response.data);
        const attrs = parsed.data.attributes;

        return {
            id: parsed.data.id,
            ...(attrs?.name != null && { name: attrs.name }),
            ...(attrs?.image_url != null && { image_url: attrs.image_url }),
            ...(attrs?.updated_at != null && { updated_at: attrs.updated_at })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
