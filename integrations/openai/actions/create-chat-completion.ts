import { z } from 'zod';
import { createAction } from 'nango';

const MessageSchema = z.object({
    role: z.enum(['system', 'user', 'assistant', 'tool', 'function']),
    content: z.string()
});

const InputSchema = z.object({
    model: z.string(),
    messages: z.array(MessageSchema),
    temperature: z.number().optional(),
    max_tokens: z.number().optional(),
    tools: z.array(z.any()).optional(),
    tool_choice: z.any().optional(),
    response_format: z.any().optional(),
    stream: z.boolean().optional()
});

const ChoiceSchema = z.object({
    index: z.number(),
    message: z.object({
        role: z.string(),
        content: z.string().nullable()
    }),
    finish_reason: z.string().optional()
});

const ProviderResponseSchema = z.object({
    id: z.string(),
    object: z.string(),
    created: z.number(),
    model: z.string(),
    choices: z.array(ChoiceSchema),
    usage: z
        .object({
            prompt_tokens: z.number(),
            completion_tokens: z.number(),
            total_tokens: z.number()
        })
        .optional()
});

const OutputSchema = z.object({
    id: z.string(),
    object: z.string(),
    created: z.number(),
    model: z.string(),
    choices: z.array(ChoiceSchema),
    usage: z
        .object({
            prompt_tokens: z.number(),
            completion_tokens: z.number(),
            total_tokens: z.number()
        })
        .optional()
});

const action = createAction({
    description: 'Create a Chat Completions API response for compatibility workflows',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/create-chat-completion',
        group: 'Chat'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['model.request'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://platform.openai.com/docs/api-reference/chat/create
        const response = await nango.post({
            endpoint: '/v1/chat/completions',
            data: {
                model: input.model,
                messages: input.messages,
                ...(input.temperature !== undefined && { temperature: input.temperature }),
                ...(input.max_tokens !== undefined && { max_tokens: input.max_tokens }),
                ...(input.tools !== undefined && { tools: input.tools }),
                ...(input.tool_choice !== undefined && { tool_choice: input.tool_choice }),
                ...(input.response_format !== undefined && { response_format: input.response_format }),
                stream: input.stream ?? false
            },
            retries: 3
        });

        const providerData = ProviderResponseSchema.parse(response.data);

        return {
            id: providerData.id,
            object: providerData.object,
            created: providerData.created,
            model: providerData.model,
            choices: providerData.choices,
            ...(providerData.usage !== undefined && { usage: providerData.usage })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
