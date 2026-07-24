import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    url: z.string().optional().describe('URL of the image to import. Example: "https://example.com/image.png"'),
    image: z.string().optional().describe('Base64-encoded image data without data URI prefix. Example: "iVBORw0KGgoAAAANSUhEUg..."'),
    file_name: z.string().optional().describe('File name for the image. Example: "newimage.gif"'),
    upload_source: z.enum(['user_upload', 'stock_image', 'stock_icon', 'unknown']).optional().describe('Source of the image upload.')
});

const ProviderImageSchema = z
    .object({
        id: z.string(),
        src: z.string(),
        file_name: z.string().optional(),
        width: z.number().optional(),
        height: z.number().optional(),
        media_type: z.string().optional(),
        has_alpha: z.boolean().optional(),
        avg_color: z.string().optional(),
        upload_source: z.enum(['user_upload', 'stock_image', 'stock_icon', 'unknown']).optional()
    })
    .passthrough();

const OutputSchema = ProviderImageSchema;

const action = createAction({
    description: 'Register an image from a URL or base64 payload.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['images:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        if (!input.url && !input.image) {
            throw new nango.ActionError({
                type: 'missing_input',
                message: 'Either "url" or "image" must be provided.'
            });
        }

        const requestBody: Record<string, unknown> = {};
        if (input.url !== undefined) {
            requestBody['url'] = input.url;
        }
        if (input.image !== undefined) {
            requestBody['image'] = input.image;
        }
        if (input.file_name !== undefined) {
            requestBody['file_name'] = input.file_name;
        }
        if (input.upload_source !== undefined) {
            requestBody['upload_source'] = input.upload_source;
        }

        // https://www.typeform.com/developers/create/reference/create-image/
        const response = await nango.post({
            endpoint: '/images',
            data: requestBody,
            retries: 3
        });

        const providerImage = ProviderImageSchema.parse(response.data);

        return providerImage;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
