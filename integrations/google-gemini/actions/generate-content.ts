import { z } from 'zod';
import { createAction } from 'nango';

const PartSchema = z
    .object({
        text: z.string().optional()
    })
    .passthrough();

const ContentSchema = z.object({
    role: z.string().optional(),
    parts: z.array(PartSchema)
});

const SystemInstructionSchema = z
    .object({
        role: z.string().optional(),
        parts: z.array(PartSchema)
    })
    .optional();

const GenerationConfigSchema = z
    .object({
        maxOutputTokens: z.number().optional(),
        temperature: z.number().optional(),
        topP: z.number().optional(),
        topK: z.number().optional(),
        stopSequences: z.array(z.string()).optional(),
        responseMimeType: z.string().optional()
    })
    .optional();

const ToolSchema = z.record(z.string(), z.unknown());

const InputSchema = z.object({
    model: z.string().optional(),
    contents: z.array(ContentSchema),
    systemInstruction: SystemInstructionSchema,
    generationConfig: GenerationConfigSchema,
    tools: z.array(ToolSchema).optional()
});

const CandidateSchema = z
    .object({
        content: z
            .object({
                role: z.string().optional(),
                parts: z.array(PartSchema).optional()
            })
            .optional(),
        finishReason: z.string().optional(),
        index: z.number().optional(),
        safetyRatings: z.array(z.record(z.string(), z.unknown())).optional(),
        citationMetadata: z.record(z.string(), z.unknown()).optional(),
        groundingMetadata: z.record(z.string(), z.unknown()).optional()
    })
    .passthrough();

const UsageMetadataSchema = z
    .object({
        promptTokenCount: z.number().optional(),
        cachedContentTokenCount: z.number().optional(),
        candidatesTokenCount: z.number().optional(),
        totalTokenCount: z.number().optional()
    })
    .passthrough();

const PromptFeedbackSchema = z
    .object({
        blockReason: z.string().optional(),
        safetyRatings: z.array(z.record(z.string(), z.unknown())).optional()
    })
    .passthrough();

// Safety-blocked responses return promptFeedback with no candidates.
const OutputSchema = z.object({
    candidates: z.array(CandidateSchema).optional(),
    promptFeedback: PromptFeedbackSchema.optional(),
    usageMetadata: UsageMetadataSchema.optional()
});

const action = createAction({
    description: 'Generate content using a Gemini model with optional system instructions, tools, and generation config.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const model = input.model ?? 'gemini-2.5-flash';
        const modelId = model.startsWith('models/') ? model.slice('models/'.length) : model;
        // Encode each path segment separately so resource paths like tunedModels/{id}
        // keep their slash rather than becoming tunedModels%2F{id}.
        const encodedModelPath = modelId
            .split('/')
            .map((seg) => encodeURIComponent(seg))
            .join('/');
        // https://ai.google.dev/api/generate-content
        const response = await nango.post({
            endpoint: `/v1beta/models/${encodedModelPath}:generateContent`,
            data: {
                contents: input.contents,
                ...(input.systemInstruction !== undefined && { systemInstruction: input.systemInstruction }),
                ...(input.generationConfig !== undefined && { generationConfig: input.generationConfig }),
                ...(input.tools !== undefined && { tools: input.tools })
            },
            retries: 3
        });

        const output = OutputSchema.parse(response.data);
        return output;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
