import { z } from 'zod';
import { createAction } from 'nango';

const ContentPartTextSchema = z.object({
    type: z.literal('text'),
    text: z.string()
});

const ContentPartImageSchema = z.object({
    type: z.literal('image'),
    image_url: z.object({
        url: z.string(),
        detail: z.enum(['low', 'high', 'auto']).optional()
    })
});

const ContentPartSchema = z.union([ContentPartTextSchema, ContentPartImageSchema]);

const InputSchema = z.object({
    model: z.string().describe('Model ID to use. Example: "gpt-4o"'),
    input: z.union([z.string(), z.array(ContentPartSchema)]).describe('Input text or array of content parts'),
    instructions: z.string().optional().describe('System instructions'),
    temperature: z.number().min(0).max(2).optional().describe('Sampling temperature (0-2)'),
    max_output_tokens: z.number().int().positive().optional().describe('Maximum tokens to generate'),
    store: z.boolean().optional().describe('Whether to store the response for retrieval. Default: true'),
    tool_choice: z
        .union([
            z.enum(['none', 'auto', 'required']),
            z.object({
                type: z.literal('function'),
                function: z.object({
                    name: z.string()
                })
            })
        ])
        .optional()
        .describe('How the model should use tools'),
    tools: z
        .array(
            z.object({
                type: z.literal('function'),
                function: z.object({
                    name: z.string(),
                    description: z.string().optional(),
                    parameters: z.object({}).passthrough().optional()
                })
            })
        )
        .optional()
        .describe('Array of tools the model may use')
});

const OutputItemSchema = z.object({
    type: z.string(),
    id: z.string().optional(),
    status: z.string().optional(),
    role: z.string().optional(),
    content: z.array(z.object({}).passthrough()).optional()
});

const UsageSchema = z.object({
    input_tokens: z.number().int(),
    output_tokens: z.number().int(),
    total_tokens: z.number().int()
});

const ProviderResponseSchema = z.object({
    id: z.string(),
    object: z.literal('response'),
    created_at: z.number().int(),
    status: z.enum(['in_progress', 'completed', 'failed', 'incomplete']),
    model: z.string(),
    output: z.array(OutputItemSchema),
    usage: UsageSchema.optional(),
    error: z.object({}).passthrough().optional(),
    incomplete_details: z.object({}).passthrough().optional(),
    instructions: z.string().optional(),
    max_output_tokens: z.number().int().nullable().optional(),
    parallel_tool_calls: z.boolean().optional(),
    previous_response_id: z.string().nullable().optional(),
    reasoning: z.object({}).passthrough().optional(),
    store: z.boolean().optional(),
    temperature: z.number().optional(),
    text: z.object({}).passthrough().optional(),
    tool_choice: z.string().optional(),
    tools: z.array(z.object({}).passthrough()).optional(),
    truncation: z.string().optional(),
    user: z.string().nullable().optional(),
    metadata: z.record(z.string(), z.unknown()).optional()
});

const OutputSchema = z.object({
    id: z.string(),
    object: z.literal('response'),
    created_at: z.number().int(),
    status: z.enum(['in_progress', 'completed', 'failed', 'incomplete']),
    model: z.string(),
    output: z.array(z.object({}).passthrough()),
    usage: z
        .object({
            input_tokens: z.number().int(),
            output_tokens: z.number().int(),
            total_tokens: z.number().int()
        })
        .optional()
});

const action = createAction({
    description: 'Create a model response with text, image, file, or tool inputs.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/create-response',
        group: 'Responses'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['model.request'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://platform.openai.com/docs/api-reference/responses/create
        const response = await nango.post({
            endpoint: '/v1/responses',
            data: {
                model: input.model,
                input: input.input,
                ...(input.instructions !== undefined && { instructions: input.instructions }),
                ...(input.temperature !== undefined && { temperature: input.temperature }),
                ...(input.max_output_tokens !== undefined && { max_output_tokens: input.max_output_tokens }),
                ...(input.store !== undefined && { store: input.store }),
                ...(input.tool_choice !== undefined && { tool_choice: input.tool_choice }),
                ...(input.tools !== undefined && { tools: input.tools })
            },
            retries: 3
        });

        if (response.status !== 200) {
            throw new nango.ActionError({
                type: 'api_error',
                message: `API returned status ${response.status}`,
                response: response.data
            });
        }

        const providerData = ProviderResponseSchema.parse(response.data);

        return {
            id: providerData.id,
            object: providerData.object,
            created_at: providerData.created_at,
            status: providerData.status,
            model: providerData.model,
            output: providerData.output,
            ...(providerData.usage !== undefined && { usage: providerData.usage })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
