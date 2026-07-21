import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({});

const ImageSchema = z.object({
    id: z.string(),
    file_name: z.string(),
    src: z.string(),
    width: z.number().optional(),
    height: z.number().optional(),
    media_type: z.string().optional(),
    avg_color: z.string().optional()
});

const OutputSchema = z.object({
    items: z.array(ImageSchema)
});

const action = createAction({
    description: 'List images.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['images:read'],

    exec: async (nango, _input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://www.typeform.com/developers/create/reference/retrieve-images-collection/
            endpoint: '/images',
            retries: 3
        });

        if (!Array.isArray(response.data)) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Expected an array from the images endpoint.'
            });
        }

        const items = response.data.map((item: unknown) => {
            const parsed = ImageSchema.safeParse(item);
            if (!parsed.success) {
                throw new nango.ActionError({
                    type: 'invalid_response',
                    message: 'Invalid image object in response.',
                    details: parsed.error.issues
                });
            }
            return parsed.data;
        });

        return { items };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
