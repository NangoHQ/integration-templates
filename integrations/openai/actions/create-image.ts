import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        prompt: z.string().describe('A text description of the desired image(s).'),
        model: z.enum(['dall-e-2', 'dall-e-3']).optional().describe('The model to use for image generation. Defaults to dall-e-2.'),
        n: z.number().int().min(1).max(10).optional().describe('The number of images to generate. dall-e-3 only supports n=1.'),
        size: z
            .enum(['256x256', '512x512', '1024x1024', '1792x1024', '1024x1792'])
            .optional()
            .describe('The size of the generated images. dall-e-2: 256x256/512x512/1024x1024. dall-e-3: 1024x1024/1792x1024/1024x1792.'),
        quality: z.enum(['standard', 'hd']).optional().describe('The quality of the image. hd is only supported by dall-e-3.'),
        response_format: z.enum(['url', 'b64_json']).optional().describe('The format in which the generated images are returned.')
    })
    .superRefine((data, ctx) => {
        const model = data.model ?? 'dall-e-2';
        if (model === 'dall-e-2') {
            const dall2Sizes = ['256x256', '512x512', '1024x1024'];
            if (data.size !== undefined && !dall2Sizes.includes(data.size)) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: `dall-e-2 only supports sizes: ${dall2Sizes.join(', ')}`
                });
            }
            if (data.quality === 'hd') {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: 'dall-e-2 does not support hd quality; use dall-e-3 for hd'
                });
            }
        } else if (model === 'dall-e-3') {
            const dall3Sizes = ['1024x1024', '1792x1024', '1024x1792'];
            if (data.size !== undefined && !dall3Sizes.includes(data.size)) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: `dall-e-3 only supports sizes: ${dall3Sizes.join(', ')}`
                });
            }
            if (data.n !== undefined && data.n !== 1) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: 'dall-e-3 only supports n=1'
                });
            }
        }
    });

const ImageDataSchema = z.object({
    url: z.string().optional(),
    b64_json: z.string().optional(),
    revised_prompt: z.string().optional()
});

const ProviderResponseSchema = z.object({
    created: z.number(),
    data: z.array(ImageDataSchema)
});

const OutputSchema = z.object({
    created: z.number(),
    data: z.array(
        z.object({
            url: z.string().optional(),
            b64_json: z.string().optional(),
            revised_prompt: z.string().optional()
        })
    )
});

const action = createAction({
    description: 'Generate an image from a prompt.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/create-image',
        group: 'Images'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['model.request'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://platform.openai.com/docs/api-reference/images/create
        const response = await nango.post({
            endpoint: '/v1/images/generations',
            data: {
                prompt: input.prompt,
                model: input.model ?? 'dall-e-2',
                ...(input.n !== undefined && { n: input.n }),
                ...(input.size !== undefined && { size: input.size }),
                ...(input.quality !== undefined && { quality: input.quality }),
                ...(input.response_format !== undefined && { response_format: input.response_format })
            },
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        return {
            created: providerResponse.created,
            data: providerResponse.data.map((item) => ({
                ...(item.url !== undefined && { url: item.url }),
                ...(item.b64_json !== undefined && { b64_json: item.b64_json }),
                ...(item.revised_prompt !== undefined && { revised_prompt: item.revised_prompt })
            }))
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
