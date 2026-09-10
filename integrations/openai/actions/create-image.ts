import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    prompt: z.string().min(1).max(32000).describe('A text description of the desired image(s). Maximum 32,000 characters for GPT image models.'),
    model: z.string().optional().describe('The model to use for image generation. Example: "gpt-image-1"'),
    n: z.number().int().min(1).max(10).optional().describe('The number of images to generate. Must be between 1 and 10.'),
    size: z
        .union([z.literal('auto'), z.string().regex(/^\d+x\d+$/)])
        .optional()
        .describe('Image dimensions such as "1024x1024", "1536x1024", or "auto". Newer GPT image models support arbitrary WIDTHxHEIGHT values.'),
    quality: z
        .enum(['standard', 'hd', 'low', 'medium', 'high', 'xhigh', 'max', 'auto'])
        .optional()
        .describe('The image quality. Supported values depend on the selected model.'),
    background: z.enum(['transparent', 'opaque', 'auto']).optional().describe('The image background. Supported by GPT image models.'),
    moderation: z.enum(['low', 'auto']).optional().describe('The content moderation level for GPT image models.'),
    output_compression: z.number().int().min(0).max(100).optional().describe('Compression level from 0 to 100 for JPEG or WebP output.'),
    output_format: z.enum(['png', 'jpeg', 'webp']).optional().describe('Output format for GPT image models.'),
    response_format: z
        .enum(['url', 'b64_json'])
        .optional()
        .describe('Response format for DALL-E 2 and DALL-E 3. GPT image models always return base64-encoded images.'),
    style: z.enum(['vivid', 'natural']).optional().describe('Image style for DALL-E 3.'),
    user: z.string().optional().describe('A unique identifier representing the end user for abuse monitoring.')
});

const ProviderImageDataSchema = z.object({
    url: z.string().optional(),
    b64_json: z.string().optional(),
    revised_prompt: z.string().optional()
});

const ProviderResponseSchema = z.object({
    created: z.number().optional(),
    data: z.array(ProviderImageDataSchema)
});

const OutputSchema = z.object({
    created: z.number().optional(),
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
    version: '1.0.2',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['model.request'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://platform.openai.com/docs/api-reference/images/create
        const response = await nango.post({
            endpoint: '/v1/images/generations',
            data: {
                prompt: input.prompt,
                ...(input.model !== undefined && { model: input.model }),
                ...(input.n !== undefined && { n: input.n }),
                ...(input.size !== undefined && { size: input.size }),
                ...(input.quality !== undefined && { quality: input.quality }),
                ...(input.background !== undefined && { background: input.background }),
                ...(input.moderation !== undefined && { moderation: input.moderation }),
                ...(input.output_compression !== undefined && { output_compression: input.output_compression }),
                ...(input.output_format !== undefined && { output_format: input.output_format }),
                ...(input.response_format !== undefined && { response_format: input.response_format }),
                ...(input.style !== undefined && { style: input.style }),
                ...(input.user !== undefined && { user: input.user })
            },
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        return {
            ...(providerResponse.created !== undefined && { created: providerResponse.created }),
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
