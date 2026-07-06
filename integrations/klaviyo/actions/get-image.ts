import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('The ID of the image. Example: "343296489"')
});

const ProviderImageAttributesSchema = z
    .object({
        format: z.string().optional(),
        hidden: z.boolean().optional(),
        id: z.string().optional(),
        image_url: z.string().optional(),
        name: z.string().optional(),
        size: z.number().optional(),
        updated_at: z.string().optional()
    })
    .passthrough();

const ProviderImageDataSchema = z.object({
    type: z.string(),
    id: z.string(),
    attributes: ProviderImageAttributesSchema
});

const ProviderImageResponseSchema = z.object({
    data: ProviderImageDataSchema
});

const OutputSchema = z.object({
    id: z.string(),
    type: z.string(),
    format: z.string().optional(),
    hidden: z.boolean().optional(),
    image_url: z.string().optional(),
    name: z.string().optional(),
    size: z.number().optional(),
    updated_at: z.string().optional()
});

const action = createAction({
    description: 'Retrieve an image.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['images:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developers.klaviyo.com/en/reference/get_image
        const response = await nango.get({
            endpoint: `/api/images/${encodeURIComponent(input.id)}`,
            headers: {
                revision: '2026-04-15'
            },
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Image not found',
                id: input.id
            });
        }

        const parsed = ProviderImageResponseSchema.parse(response.data);
        const { data } = parsed;
        const attrs = data.attributes;

        return {
            id: data.id,
            type: data.type,
            ...(attrs.format !== undefined && { format: attrs.format }),
            ...(attrs.hidden !== undefined && { hidden: attrs.hidden }),
            ...(attrs.image_url !== undefined && { image_url: attrs.image_url }),
            ...(attrs.name !== undefined && { name: attrs.name }),
            ...(attrs.size !== undefined && { size: attrs.size }),
            ...(attrs.updated_at !== undefined && { updated_at: attrs.updated_at })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
