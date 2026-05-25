import { z } from 'zod';
import { createAction } from 'nango';

const ThinkingConfigSchema = z.object({
    type: z.string().describe('Thinking configuration type. Example: "enabled"'),
    budget_tokens: z.number().int().describe('Token budget for thinking. Example: 1024')
});

const ToolChoiceSchema = z.object({
    type: z.string().describe('Tool choice type. Example: "auto", "any", "tool"'),
    name: z.string().optional().describe('Tool name when type is "tool". Example: "my_tool"')
});

const TextBlockSchema = z.object({
    type: z.literal('text'),
    text: z.string()
});

const ImageBlockSchema = z.object({
    type: z.literal('image'),
    source: z.object({
        type: z.string(),
        media_type: z.string(),
        data: z.string()
    })
});

const ToolUseBlockSchema = z.object({
    type: z.literal('tool_use'),
    id: z.string(),
    name: z.string(),
    input: z.record(z.string(), z.unknown())
});

const ToolResultBlockSchema = z.object({
    type: z.literal('tool_result'),
    tool_use_id: z.string(),
    content: z.union([z.string(), z.array(z.union([TextBlockSchema, ImageBlockSchema]))]).optional(),
    is_error: z.boolean().optional()
});

const ContentBlockSchema = z.union([TextBlockSchema, ImageBlockSchema, ToolUseBlockSchema, ToolResultBlockSchema]);

const MessageSchema = z.object({
    role: z.enum(['user', 'assistant']),
    content: z.union([z.string(), z.array(ContentBlockSchema)])
});

const ToolSchema = z.object({
    name: z.string(),
    description: z.string(),
    input_schema: z.object({
        type: z.literal('object'),
        properties: z.record(z.string(), z.unknown()).optional(),
        required: z.array(z.string()).optional()
    })
});

const InputSchema = z.object({
    model: z.string().describe('Anthropic model ID. Example: "claude-3-5-sonnet-20241022"'),
    max_tokens: z.number().int().describe('Maximum tokens to generate. Example: 1024'),
    messages: z.array(MessageSchema).describe('Conversation messages'),
    system: z
        .union([z.string(), z.array(TextBlockSchema)])
        .optional()
        .describe('System prompt'),
    tools: z.array(ToolSchema).optional().describe('Tools available to the model'),
    tool_choice: ToolChoiceSchema.optional().describe('Tool choice configuration'),
    thinking: ThinkingConfigSchema.optional().describe('Thinking configuration'),
    temperature: z.number().optional().describe('Sampling temperature'),
    top_k: z.number().int().optional().describe('Top-k sampling parameter'),
    top_p: z.number().optional().describe('Top-p sampling parameter'),
    stop_sequences: z.array(z.string()).optional().describe('Stop sequences'),
    metadata: z.record(z.string(), z.string()).optional().describe('Metadata key-value pairs')
});

const UsageSchema = z.object({
    input_tokens: z.number().int(),
    output_tokens: z.number().int(),
    cache_creation_input_tokens: z.number().int().optional(),
    cache_read_input_tokens: z.number().int().optional()
});

const OutputContentBlockSchema = z.union([
    TextBlockSchema,
    ToolUseBlockSchema,
    z.object({
        type: z.literal('thinking'),
        thinking: z.string(),
        signature: z.string().optional()
    }),
    z.object({
        type: z.literal('redacted_thinking'),
        data: z.string()
    })
]);

const OutputSchema = z.object({
    id: z.string(),
    type: z.literal('message'),
    role: z.literal('assistant'),
    content: z.array(OutputContentBlockSchema),
    model: z.string(),
    stop_reason: z.union([z.string(), z.null()]).optional(),
    stop_sequence: z.union([z.string(), z.null()]).optional(),
    usage: UsageSchema
});

const action = createAction({
    description: 'Create an Anthropic model message.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/create-message',
        group: 'Messages'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const data: {
            model: string;
            max_tokens: number;
            messages: z.infer<typeof MessageSchema>[];
            system?: z.infer<typeof InputSchema>['system'];
            tools?: z.infer<typeof InputSchema>['tools'];
            tool_choice?: z.infer<typeof InputSchema>['tool_choice'];
            thinking?: z.infer<typeof InputSchema>['thinking'];
            temperature?: z.infer<typeof InputSchema>['temperature'];
            top_k?: z.infer<typeof InputSchema>['top_k'];
            top_p?: z.infer<typeof InputSchema>['top_p'];
            stop_sequences?: z.infer<typeof InputSchema>['stop_sequences'];
            metadata?: z.infer<typeof InputSchema>['metadata'];
        } = {
            model: input.model,
            max_tokens: input.max_tokens,
            messages: input.messages
        };

        if (input.system !== undefined) {
            data.system = input.system;
        }
        if (input.tools !== undefined) {
            data.tools = input.tools;
        }
        if (input.tool_choice !== undefined) {
            data.tool_choice = input.tool_choice;
        }
        if (input.thinking !== undefined) {
            data.thinking = input.thinking;
        }
        if (input.temperature !== undefined) {
            data.temperature = input.temperature;
        }
        if (input.top_k !== undefined) {
            data.top_k = input.top_k;
        }
        if (input.top_p !== undefined) {
            data.top_p = input.top_p;
        }
        if (input.stop_sequences !== undefined) {
            data.stop_sequences = input.stop_sequences;
        }
        if (input.metadata !== undefined) {
            data.metadata = input.metadata;
        }

        // https://docs.anthropic.com/en/api/messages
        const response = await nango.post({
            endpoint: '/v1/messages',
            data,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'empty_response',
                message: 'Received an empty response from Anthropic API.'
            });
        }

        if (
            response.data &&
            typeof response.data === 'object' &&
            'type' in response.data &&
            response.data.type === 'error' &&
            'error' in response.data &&
            response.data.error &&
            typeof response.data.error === 'object'
        ) {
            const errorData = response.data.error;
            const errorMessage = 'message' in errorData ? String(errorData.message) : 'Unknown Anthropic API error';
            throw new nango.ActionError({
                type: 'api_error',
                message: errorMessage,
                details: response.data.error
            });
        }

        const parsed = OutputSchema.parse(response.data);
        return parsed;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
