import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    image_id: z.string().describe('Unique ID for the image to retrieve. Example: "pshDCOusAapn"')
});

const ProviderImageSchema = z.object({
    id: z.string(),
    src: z.string(),
    file_name: z.string(),
    width: z.number(),
    height: z.number(),
    media_type: z.string(),
    has_alpha: z.boolean(),
    avg_color: z.string()
});

const OutputSchema = z.object({
    id: z.string(),
    src: z.string(),
    file_name: z.string(),
    width: z.number(),
    height: z.number(),
    media_type: z.string(),
    has_alpha: z.boolean(),
    avg_color: z.string()
});

const action = createAction({
    description: 'Retrieve image metadata',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['images:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://www.typeform.com/developers/create/reference/retrieve-image/
            endpoint: `/images/${encodeURIComponent(input.image_id)}`,
            headers: {
                Accept: 'application/json'
            },
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Image not found',
                image_id: input.image_id
            });
        }

        const providerImage = ProviderImageSchema.parse(response.data);

        return {
            id: providerImage.id,
            src: providerImage.src,
            file_name: providerImage.file_name,
            width: providerImage.width,
            height: providerImage.height,
            media_type: providerImage.media_type,
            has_alpha: providerImage.has_alpha,
            avg_color: providerImage.avg_color
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
