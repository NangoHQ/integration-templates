import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    brandTemplateId: z.string().describe('The brand template ID. Example: "DEMzWSwy3BI"')
});

const ThumbnailSchema = z.object({
    width: z.number(),
    height: z.number(),
    url: z.string()
});

const ProviderBrandTemplateSchema = z.object({
    id: z.string(),
    title: z.string(),
    view_url: z.string(),
    create_url: z.string(),
    thumbnail: ThumbnailSchema.optional(),
    created_at: z.number(),
    updated_at: z.number()
});

const OutputSchema = z.object({
    id: z.string(),
    title: z.string(),
    view_url: z.string(),
    create_url: z.string(),
    thumbnail: ThumbnailSchema.optional(),
    created_at: z.number(),
    updated_at: z.number()
});

const action = createAction({
    description: 'Retrieve brand template metadata.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['brandtemplate:meta:read'],
    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://www.canva.dev/docs/connect/api-reference/brand-templates/get-brand-template/
            endpoint: `/rest/v1/brand-templates/${encodeURIComponent(input.brandTemplateId)}`,
            retries: 3
        });

        const providerResponse = z
            .object({
                brand_template: ProviderBrandTemplateSchema
            })
            .parse(response.data);

        const brandTemplate = providerResponse.brand_template;

        return {
            id: brandTemplate.id,
            title: brandTemplate.title,
            view_url: brandTemplate.view_url,
            create_url: brandTemplate.create_url,
            ...(brandTemplate.thumbnail !== undefined && { thumbnail: brandTemplate.thumbnail }),
            created_at: brandTemplate.created_at,
            updated_at: brandTemplate.updated_at
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
