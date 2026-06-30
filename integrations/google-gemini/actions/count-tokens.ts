import { z } from 'zod';
import { createAction } from 'nango';

const PartSchema = z
    .object({
        text: z.string().optional(),
        inlineData: z
            .object({
                mimeType: z.string(),
                data: z.string()
            })
            .optional(),
        fileData: z
            .object({
                mimeType: z.string(),
                fileUri: z.string()
            })
            .optional()
    })
    .passthrough();

const ContentSchema = z.object({
    role: z.string().optional(),
    parts: z.array(PartSchema)
});

const InputSchema = z.object({
    model: z.string().optional().describe('Model name. Example: "gemini-2.5-flash"'),
    contents: z.array(ContentSchema).describe('Input contents to tokenize.'),
    systemInstruction: ContentSchema.optional().describe('Optional system instruction content.')
});

const PromptTokensDetailSchema = z.object({
    modality: z.string().optional(),
    tokenCount: z.number().optional()
});

const OutputSchema = z.object({
    totalTokens: z.number().describe('Total number of tokens in the input.'),
    promptTokensDetails: z.array(PromptTokensDetailSchema).optional()
});

const action = createAction({
    description: 'Count tokens for a given request without generating a response.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const model = input.model ?? 'gemini-2.5-flash';
        const modelId = model.startsWith('models/') ? model.slice('models/'.length) : model;

        const requestBody: Record<string, unknown> = {
            contents: input.contents
        };

        if (input.systemInstruction !== undefined) {
            requestBody['systemInstruction'] = input.systemInstruction;
        }

        const response = await nango.post({
            // https://ai.google.dev/api/tokens
            endpoint: `/v1beta/models/${encodeURIComponent(modelId)}:countTokens`,
            data: requestBody,
            retries: 3
        });

        const providerResponse = z
            .object({
                totalTokens: z.number(),
                promptTokensDetails: z.array(PromptTokensDetailSchema).optional()
            })
            .parse(response.data);

        return {
            totalTokens: providerResponse.totalTokens,
            ...(providerResponse.promptTokensDetails !== undefined && {
                promptTokensDetails: providerResponse.promptTokensDetails
            })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
