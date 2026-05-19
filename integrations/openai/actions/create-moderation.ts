import { z } from 'zod';
import { createAction } from 'nango';

const TextItemSchema = z.object({
    type: z.literal('text'),
    text: z.string()
});

const ImageItemSchema = z.object({
    type: z.literal('image_url'),
    image_url: z.object({ url: z.string() })
});

const ContentItemSchema = z.union([TextItemSchema, ImageItemSchema]);

const InputSchema = z
    .object({
        input: z
            .union([z.string(), z.array(z.string()), z.array(ContentItemSchema)])
            .describe('The input to classify. Can be a string, array of strings, or mixed array of text and image_url objects.'),
        model: z
            .enum(['omni-moderation-latest', 'text-moderation-latest'])
            .optional()
            .describe('The moderation model to use. Defaults to omni-moderation-latest.')
    })
    .superRefine((data, ctx) => {
        if (data.model === 'text-moderation-latest') {
            const hasImages =
                Array.isArray(data.input) &&
                data.input.some((item) => typeof item === 'object' && item !== null && 'type' in item && item.type === 'image_url');
            if (hasImages) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: 'text-moderation-latest does not support image inputs; use omni-moderation-latest for images'
                });
            }
        }
    });

const CategoryScoresSchema = z.object({
    sexual: z.number(),
    'sexual/minors': z.number(),
    harassment: z.number(),
    'harassment/threatening': z.number(),
    hate: z.number(),
    'hate/threatening': z.number(),
    illicit: z.number(),
    'illicit/violent': z.number(),
    'self-harm': z.number(),
    'self-harm/intent': z.number(),
    'self-harm/instructions': z.number(),
    violence: z.number(),
    'violence/graphic': z.number()
});

const CategoriesSchema = z.object({
    sexual: z.boolean(),
    'sexual/minors': z.boolean(),
    harassment: z.boolean(),
    'harassment/threatening': z.boolean(),
    hate: z.boolean(),
    'hate/threatening': z.boolean(),
    illicit: z.boolean(),
    'illicit/violent': z.boolean(),
    'self-harm': z.boolean(),
    'self-harm/intent': z.boolean(),
    'self-harm/instructions': z.boolean(),
    violence: z.boolean(),
    'violence/graphic': z.boolean()
});

const ModerationResultSchema = z.object({
    flagged: z.boolean().describe('Whether the content violates OpenAI usage policies.'),
    categories: CategoriesSchema.describe('Dictionary of moderation categories and whether each was triggered.'),
    category_scores: CategoryScoresSchema.describe('Dictionary of moderation categories with confidence scores.')
});

const ProviderModerationSchema = z.object({
    id: z.string(),
    model: z.string(),
    results: z.array(ModerationResultSchema)
});

const OutputSchema = z.object({
    id: z.string().describe('The unique identifier for the moderation request.'),
    model: z.string().describe('The model used to generate the moderation results.'),
    results: z.array(ModerationResultSchema).describe('An array of moderation results for each input provided.')
});

const action = createAction({
    description: 'Classify whether text or images violate OpenAI usage policies.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/create-moderation',
        group: 'Moderations'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['model.request'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://platform.openai.com/docs/api-reference/moderations/create
        const response = await nango.post({
            endpoint: '/v1/moderations',
            data: {
                input: input.input,
                ...(input.model !== undefined && { model: input.model })
            },
            retries: 3
        });

        const moderation = ProviderModerationSchema.parse(response.data);

        return {
            id: moderation.id,
            model: moderation.model,
            results: moderation.results
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
